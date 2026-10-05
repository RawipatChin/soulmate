import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  UserCredential,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { auth, db, storage, isFirebaseConfigured, checkFirebaseConfig } from '../lib/firebase';
import { mapFirebaseAuthError } from '../utils/authErrors';
import type {
  CustomerProfile,
  CustomerRegistrationPayload,
  CustomerProfileUpdatePayload,
  ShippingAddress,
  MembershipTier,
} from '../types';

export type { CustomerRegistrationPayload, CustomerProfileUpdatePayload, ShippingAddress };

export interface AuthContextType {
  user: User | null;
  customerProfile: CustomerProfile | null;
  profileLoading: boolean;
  profileNotFound: boolean;
  profileError: string | null;
  loading: boolean;
  isAuthenticated: boolean;
  isFirebaseConfigured: boolean;
  missingConfigKeys: string[];
  pendingCustomerData: CustomerRegistrationPayload | null;
  authError: string | null;
  adminAttemptRole: string | null;
  login: (email: string, password: string) => Promise<UserCredential>;
  register: (
    email: string,
    password: string,
    extraData: CustomerRegistrationPayload
  ) => Promise<UserCredential>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  adminLogin: (
    email: string,
    password: string,
    requestedRole: string
  ) => Promise<{ credential: UserCredential; authorized: boolean; reason?: string }>;
  uploadProfilePhoto: (file: File) => Promise<string>;
  deleteProfilePhoto: () => Promise<void>;
  updateCustomerProfile: (data: CustomerProfileUpdatePayload) => Promise<void>;
  updateDefaultShippingAddress: (address: ShippingAddress) => Promise<void>;
  refreshCustomerProfile: () => Promise<CustomerProfile | null>;
  clearError: () => void;
}

/**
 * Detect real image type from file bytes.
 * Do not trust filename / MIME alone.
 */
const detectImageMime = (bytes: Uint8Array): string | null => {
  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return 'image/jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  // WEBP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && // R
    bytes[1] === 0x49 && // I
    bytes[2] === 0x46 && // F
    bytes[3] === 0x46 && // F
    bytes[8] === 0x57 && // W
    bytes[9] === 0x45 && // E
    bytes[10] === 0x42 && // B
    bytes[11] === 0x50 // P
  ) {
    return 'image/webp';
  }

  return null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(true);
  const [profileNotFound, setProfileNotFound] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingCustomerData, setPendingCustomerData] = useState<CustomerRegistrationPayload | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [adminAttemptRole, setAdminAttemptRole] = useState<string | null>(null);

  const { isConfigured, missingKeys } = checkFirebaseConfig();

  const loadCustomerProfile = async (
    uid: string,
    firebaseUser?: User | null
  ): Promise<CustomerProfile | null> => {
    if (!db) {
      setProfileLoading(false);
      return null;
    }

    setProfileLoading(true);
    setProfileNotFound(false);
    setProfileError(null);

    try {
      const userDocRef = doc(db, 'users', uid);
      const docSnap = await getDoc(userDocRef);

      if (docSnap.exists()) {
        const data = docSnap.data();
        const profile: CustomerProfile = {
          uid,
          email: data.email || firebaseUser?.email || '',
          displayName: data.displayName || firebaseUser?.displayName || '',
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          phone: data.phone || '',
          photoURL: data.photoURL !== undefined ? data.photoURL : (firebaseUser?.photoURL || null),
          role: data.role || 'customer',
          status: data.status || 'active',
          membershipTier: (data.membershipTier as MembershipTier) || 'classic',
          completedOrderCount: typeof data.completedOrderCount === 'number' ? data.completedOrderCount : 0,
          lifetimeSpend: typeof data.lifetimeSpend === 'number' ? data.lifetimeSpend : 0,
          defaultShippingAddress: data.defaultShippingAddress
            ? {
                firstName: data.defaultShippingAddress.firstName || '',
                lastName: data.defaultShippingAddress.lastName || '',
                phone: data.defaultShippingAddress.phone || '',
                addressLine1: data.defaultShippingAddress.addressLine1 || '',
                subdistrict: data.defaultShippingAddress.subdistrict || '',
                district: data.defaultShippingAddress.district || '',
                province: data.defaultShippingAddress.province || '',
                postalCode: data.defaultShippingAddress.postalCode || '',
              }
            : null,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
        setCustomerProfile(profile);
        setProfileNotFound(false);
        setProfileError(null);
        return profile;
      } else {
        console.error(`[SOULMATE Auth] No Firestore document found at users/${uid}`);
        setCustomerProfile(null);
        setProfileNotFound(true);
        setProfileError('ไม่พบข้อมูลโปรไฟล์ กรุณาลองเข้าสู่ระบบใหม่');
        return null;
      }
    } catch (err: any) {
      console.error('[SOULMATE Auth] Error fetching customer profile from Firestore:', err);
      setCustomerProfile(null);
      setProfileError('ไม่สามารถโหลดข้อมูลโปรไฟล์ได้ กรุณาลองใหม่อีกครั้ง');
      return null;
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      setProfileLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);
        if (currentUser) {
          await loadCustomerProfile(currentUser.uid, currentUser);
        } else {
          setCustomerProfile(null);
          setProfileLoading(false);
          setProfileNotFound(false);
          setProfileError(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error('[SOULMATE Auth] onAuthStateChanged error:', err);
        setAuthError(mapFirebaseAuthError(err));
        setLoading(false);
        setProfileLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const clearError = () => {
    setAuthError(null);
    setProfileError(null);
  };

  const login = async (email: string, password: string): Promise<UserCredential> => {
    clearError();
    if (!auth) {
      const errMessage = 'กรุณาระบุ Firebase configuration ในไฟล์ .env ก่อนเข้าสู่ระบบ';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      return credential;
    } catch (err) {
      const friendlyMessage = mapFirebaseAuthError(err);
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  /**
   * Customer Registration with Firestore Document Creation
   */
  const register = async (
    email: string,
    password: string,
    extraData: CustomerRegistrationPayload
  ): Promise<UserCredential> => {
    clearError();
    if (!auth) {
      const errMessage = 'กรุณาระบุ Firebase configuration ในไฟล์ .env ก่อนลงทะเบียน';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }

    const cleanEmail = email.trim();
    const firstName = extraData?.firstName?.trim() || '';
    const lastName = extraData?.lastName?.trim() || '';
    const phone = extraData?.phone?.trim() || '';
    const displayName = `${firstName} ${lastName}`.trim();

    try {
      const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const newUser = credential.user;
      const uid = newUser.uid;

      try {
        await updateProfile(newUser, {
          displayName: displayName || cleanEmail.split('@')[0],
        });
      } catch (profileErr) {
        console.warn('[SOULMATE Auth] updateProfile displayName note:', profileErr);
      }

      if (db) {
        try {
          const userDocRef = doc(db, 'users', uid);
          await setDoc(userDocRef, {
            email: newUser.email || cleanEmail,
            displayName: displayName,
            firstName: firstName,
            lastName: lastName,
            phone: phone,
            photoURL: null,
            role: 'customer',
            status: 'active',
            membershipTier: 'classic',
            completedOrderCount: 0,
            lifetimeSpend: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });

          setCustomerProfile({
            uid,
            email: newUser.email || cleanEmail,
            displayName,
            firstName,
            lastName,
            phone,
            photoURL: null,
            role: 'customer',
            status: 'active',
            membershipTier: 'classic',
            completedOrderCount: 0,
            lifetimeSpend: 0,
          });
          setProfileNotFound(false);
          setProfileError(null);
        } catch (firestoreErr: any) {
          console.error('[SOULMATE Auth] Firestore customer document creation failed:', firestoreErr);
          const errMessage = 'ลงทะเบียนผู้ใช้สำเร็จ แต่ไม่สามารถสร้างโปรไฟล์ในฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง';
          setAuthError(errMessage);
          throw new Error(errMessage);
        }
      } else {
        console.warn('[SOULMATE Auth] Firestore db instance not initialized');
      }

      return credential;
    } catch (err: any) {
      const friendlyMessage = err.message || mapFirebaseAuthError(err);
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const logout = async (): Promise<void> => {
    clearError();
    if (!auth) {
      setUser(null);
      setCustomerProfile(null);
      return;
    }

    try {
      await signOut(auth);
      setCustomerProfile(null);
      setProfileLoading(false);
      setProfileNotFound(false);
      setProfileError(null);
      setPendingCustomerData(null);
      setAdminAttemptRole(null);
    } catch (err) {
      const friendlyMessage = mapFirebaseAuthError(err);
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  const resetPassword = async (email: string): Promise<void> => {
    clearError();
    if (!auth) {
      const errMessage = 'กรุณาระบุ Firebase configuration ในไฟล์ .env ก่อนรีเซ็ตรหัสผ่าน';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }

    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (err) {
      const friendlyMessage = mapFirebaseAuthError(err);
      setAuthError(friendlyMessage);
      throw new Error(friendlyMessage);
    }
  };

  /**
   * Admin Login with Role and Status Verification
   */
  const adminLogin = async (
    email: string,
    password: string,
    requestedRole: string
  ): Promise<{
    credential: UserCredential;
    authorized: boolean;
    reason?: string;
  }> => {
    clearError();

    if (!auth) {
      const errMessage =
        'กรุณาระบุ Firebase configuration ก่อนเข้าสู่ระบบผู้ดูแลระบบ';

      setAuthError(errMessage);
      throw new Error(errMessage);
    }

    if (!db) {
      const errMessage =
        'ระบบฐานข้อมูล Firestore ยังไม่ได้เชื่อมต่อ';

      setAuthError(errMessage);
      throw new Error(errMessage);
    }

    // Normalize role sent from UI
    const normalizeRequestedRole = (role: string): string => {
      const value = role
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/-/g, '_');

      if (
        value === 'super_admin' ||
        value === 'superadmin'
      ) {
        return 'super_admin';
      }

      if (value === 'admin') {
        return 'admin';
      }

      return value;
    };

    const expectedRole =
      normalizeRequestedRole(requestedRole);

    setAdminAttemptRole(expectedRole);

    let credential: UserCredential | null = null;

    try {
      // 1. Firebase Authentication
      credential =
        await signInWithEmailAndPassword(
          auth,
          email.trim(),
          password
        );

      const firebaseUser = credential.user;
      const uid = firebaseUser.uid;

      // 2. Read real role from Firestore users/{uid}
      const userDocRef = doc(
        db,
        'users',
        uid
      );

      const userSnapshot =
        await getDoc(userDocRef);

      if (!userSnapshot.exists()) {
        await signOut(auth);

        const reason =
          'ไม่พบข้อมูลผู้ดูแลระบบในฐานข้อมูล';

        setAuthError(reason);

        return {
          credential,
          authorized: false,
          reason,
        };
      }

      const userData =
        userSnapshot.data();

      const actualRole =
        String(userData.role || '')
          .trim()
          .toLowerCase();

      const status =
        String(userData.status || '')
          .trim()
          .toLowerCase();

      console.log(
        '[SOULMATE Admin Login] Role verification:',
        {
          uid,
          requestedRole: expectedRole,
          actualRole,
          status,
        }
      );

      // 3. Account must be active
      if (status !== 'active') {
        await signOut(auth);

        const reason =
          'บัญชีผู้ดูแลระบบนี้ไม่ได้อยู่ในสถานะใช้งาน';

        setAuthError(reason);

        return {
          credential,
          authorized: false,
          reason,
        };
      }

      // 4. Only admin / super_admin are allowed
      if (
        actualRole !== 'admin' &&
        actualRole !== 'super_admin'
      ) {
        await signOut(auth);

        const reason =
          'บัญชีนี้ไม่มีสิทธิ์เข้าสู่ระบบหลังบ้าน';

        setAuthError(reason);

        return {
          credential,
          authorized: false,
          reason,
        };
      }

      // 5. Selected login type must match Firestore role
      if (expectedRole !== actualRole) {
        await signOut(auth);

        const readableRole =
          actualRole === 'super_admin'
            ? 'Super Admin'
            : 'Admin';

        const reason =
          `บัญชีนี้มีสิทธิ์เป็น ${readableRole} กรุณาเลือกประเภทการเข้าสู่ระบบให้ถูกต้อง`;

        setAuthError(reason);

        return {
          credential,
          authorized: false,
          reason,
        };
      }

      // 6. Authorized - load actual Firestore profile into context
      await loadCustomerProfile(
        uid,
        firebaseUser
      );

      setAuthError(null);

      console.log(
        '[SOULMATE Admin Login] Authorized:',
        actualRole
      );

      return {
        credential,
        authorized: true,
      };
    } catch (err: any) {
      console.error(
        '[SOULMATE Admin Login] Error:',
        err
      );

      const friendlyMessage =
        err?.message ||
        mapFirebaseAuthError(err);

      setAuthError(friendlyMessage);

      throw new Error(
        friendlyMessage
      );
    }
  };

  /**
   * Customer Profile Photo Upload
   */
  const uploadProfilePhoto = async (file: File): Promise<string> => {
    clearError();

    if (!auth?.currentUser) {
      const message = 'กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปภาพ';
      setAuthError(message);
      throw new Error(message);
    }

    if (!storage) {
      const message = 'ระบบจัดเก็บรูปภาพ (Firebase Storage) ยังไม่ได้กำหนดค่า';
      setAuthError(message);
      throw new Error(message);
    }

    if (!file) {
      const message = 'ไม่พบไฟล์รูปภาพที่เลือก';
      setAuthError(message);
      throw new Error(message);
    }

    const maxSize = 5 * 1024 * 1024;

    if (file.size > maxSize) {
      const message = 'รูปภาพต้องมีขนาดไม่เกิน 5 MB';
      setAuthError(message);
      throw new Error(message);
    }

    const uid = auth.currentUser.uid;

    try {
      console.log('[SOULMATE Profile Photo] Selected file:', {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      const arrayBuffer = await file.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      if (bytes.byteLength === 0) {
        throw new Error('ไฟล์รูปภาพว่างเปล่า กรุณาเลือกรูปใหม่');
      }

      const detectedMime = detectImageMime(bytes);

      if (!detectedMime) {
        console.error(
          '[SOULMATE Profile Photo] Invalid image bytes:',
          bytes.slice(0, 20)
        );
        throw new Error(
          'ไฟล์ที่เลือกไม่ใช่รูป JPG, PNG หรือ WEBP ที่สมบูรณ์ กรุณาเลือกรูปใหม่'
        );
      }

      const storageRef = ref(
        storage,
        `users/${uid}/profile/avatar`
      );

      const uploadResult = await uploadBytes(
        storageRef,
        bytes,
        {
          contentType: detectedMime,
          cacheControl: 'public,max-age=3600',
        }
      );

      const downloadURL = await getDownloadURL(
        uploadResult.ref
      );

      await updateProfile(auth.currentUser, {
        photoURL: downloadURL,
      });

      if (db) {
        const userDocRef = doc(
          db,
          'users',
          uid
        );

        await updateDoc(userDocRef, {
          photoURL: downloadURL,
          updatedAt: serverTimestamp(),
        });

        const refreshedSnapshot = await getDoc(
          userDocRef
        );

        if (refreshedSnapshot.exists()) {
          const data = refreshedSnapshot.data();
          setCustomerProfile((prev) =>
            prev
              ? {
                  ...prev,
                  photoURL: data.photoURL || downloadURL,
                }
              : null
          );
        } else {
          setCustomerProfile((prev) =>
            prev
              ? {
                  ...prev,
                  photoURL: downloadURL,
                }
              : null
          );
        }
      } else {
        setCustomerProfile((prev) =>
          prev
            ? {
                ...prev,
                photoURL: downloadURL,
              }
            : null
        );
      }

      setUser(
        auth.currentUser
          ? Object.assign(Object.create(Object.getPrototypeOf(auth.currentUser)), auth.currentUser)
          : null
      );

      return downloadURL;
    } catch (err: any) {
      console.error(
        '[SOULMATE Auth] uploadProfilePhoto error:',
        err
      );

      const message =
        err?.message ||
        'ไม่สามารถอัปโหลดรูปได้ กรุณาลองอีกครั้ง';

      setAuthError(message);
      throw new Error(message);
    }
  };

  /**
   * Customer Profile Photo Remove
   */
  const deleteProfilePhoto = async (): Promise<void> => {
    clearError();
    if (!auth || !auth.currentUser) {
      const errMessage = 'กรุณาเข้าสู่ระบบก่อนจัดการรูปภาพ';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }

    const uid = auth.currentUser.uid;
    try {
      if (storage) {
        try {
          const storageRef = ref(storage, `users/${uid}/profile/avatar`);
          await deleteObject(storageRef);
        } catch (storageErr) {
          console.warn('[SOULMATE Auth] Storage deleteObject note:', storageErr);
        }
      }

      await updateProfile(auth.currentUser, { photoURL: '' });

      if (db) {
        try {
          const userDocRef = doc(db, 'users', uid);
          await updateDoc(userDocRef, {
            photoURL: null,
            updatedAt: serverTimestamp(),
          });
        } catch (fsErr) {
          console.warn('[SOULMATE Auth] Could not clear photoURL in Firestore:', fsErr);
        }
      }

      setCustomerProfile((prev) => (prev ? { ...prev, photoURL: null } : null));

      setUser(
        auth.currentUser
          ? Object.assign(Object.create(Object.getPrototypeOf(auth.currentUser)), auth.currentUser)
          : null
      );
    } catch (err: any) {
      console.error('[SOULMATE Auth] deleteProfilePhoto error:', err);
      const errMessage = 'ไม่สามารถลบรูปโปรไฟล์ได้ กรุณาลองอีกครั้ง';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }
  };

  /**
   * Profile Edit Save
   */
  const updateCustomerProfile = async (
    data: CustomerProfileUpdatePayload
  ): Promise<void> => {
    clearError();
    if (!auth || !auth.currentUser) {
      const errMessage = 'กรุณาเข้าสู่ระบบก่อนแก้ไขข้อมูลส่วนตัว';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }

    const uid = auth.currentUser.uid;
    const firstName = data.firstName.trim();
    const lastName = data.lastName.trim();
    const phone = data.phone.trim();
    const displayName = `${firstName} ${lastName}`.trim();

    if (db) {
      try {
        const userDocRef = doc(db, 'users', uid);
        await updateDoc(userDocRef, {
          displayName,
          firstName,
          lastName,
          phone,
          updatedAt: serverTimestamp(),
        });

        const refreshedSnap = await getDoc(userDocRef);
        if (refreshedSnap.exists()) {
          const docData = refreshedSnap.data();
          const refreshedProfile: CustomerProfile = {
            uid,
            email: docData.email || auth.currentUser.email || '',
            displayName: docData.displayName || displayName,
            firstName: docData.firstName || firstName,
            lastName: docData.lastName || lastName,
            phone: docData.phone || phone,
            photoURL: docData.photoURL !== undefined ? docData.photoURL : (auth.currentUser.photoURL || null),
            role: docData.role || 'customer',
            status: docData.status || 'active',
            membershipTier: (docData.membershipTier as MembershipTier) || 'classic',
            completedOrderCount: typeof docData.completedOrderCount === 'number' ? docData.completedOrderCount : 0,
            lifetimeSpend: typeof docData.lifetimeSpend === 'number' ? docData.lifetimeSpend : 0,
            defaultShippingAddress: docData.defaultShippingAddress
              ? {
                  firstName: docData.defaultShippingAddress.firstName || '',
                  lastName: docData.defaultShippingAddress.lastName || '',
                  phone: docData.defaultShippingAddress.phone || '',
                  addressLine1: docData.defaultShippingAddress.addressLine1 || '',
                  subdistrict: docData.defaultShippingAddress.subdistrict || '',
                  district: docData.defaultShippingAddress.district || '',
                  province: docData.defaultShippingAddress.province || '',
                  postalCode: docData.defaultShippingAddress.postalCode || '',
                }
              : null,
            createdAt: docData.createdAt,
            updatedAt: docData.updatedAt,
          };
          setCustomerProfile(refreshedProfile);
        }
      } catch (fsErr: any) {
        console.error('[SOULMATE Auth] updateCustomerProfile updateDoc error:', fsErr);
        const errMessage = 'ไม่สามารถบันทึกข้อมูลในฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง';
        setAuthError(errMessage);
        throw new Error(errMessage);
      }
    }

    try {
      await updateProfile(auth.currentUser, { displayName });
    } catch (authProfileErr) {
      console.warn('[SOULMATE Auth] updateProfile displayName error:', authProfileErr);
    }

    setCustomerProfile((prev) =>
      prev
        ? {
            ...prev,
            displayName,
            firstName,
            lastName,
            phone,
          }
        : null
    );

    setUser(
      auth.currentUser
        ? Object.assign(Object.create(Object.getPrototypeOf(auth.currentUser)), auth.currentUser)
        : null
    );
  };

  /**
   * Update Customer Default Shipping Address
   */
  const updateDefaultShippingAddress = async (
    address: ShippingAddress
  ): Promise<void> => {
    clearError();

    if (!auth || !auth.currentUser) {
      const errMessage = 'กรุณาเข้าสู่ระบบก่อนบันทึกที่อยู่จัดส่ง';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }

    if (!db) {
      const errMessage = 'ระบบฐานข้อมูล (Firestore) ยังไม่ได้กำหนดค่า';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }

    const firstName = address.firstName?.trim() || '';
    const lastName = address.lastName?.trim() || '';
    const phone = address.phone?.trim() || '';
    const addressLine1 = address.addressLine1?.trim() || '';
    const subdistrict = address.subdistrict?.trim() || '';
    const district = address.district?.trim() || '';
    const province = address.province?.trim() || '';
    const postalCode = address.postalCode?.trim() || '';

    if (!firstName) {
      const errMessage = 'กรุณาระบุชื่อผู้รับ';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }
    if (!lastName) {
      const errMessage = 'กรุณาระบุนามสกุลผู้รับ';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }
    if (!phone) {
      const errMessage = 'กรุณาระบุเบอร์โทรศัพท์';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }
    if (!addressLine1) {
      const errMessage = 'กรุณาระบุที่อยู่ / บ้านเลขที่ / ถนน';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }
    if (!subdistrict) {
      const errMessage = 'กรุณาระบุตำบล / แขวง';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }
    if (!district) {
      const errMessage = 'กรุณาระบุอำเภอ / เขต';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }
    if (!province) {
      const errMessage = 'กรุณาระบุจังหวัด';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }
    if (!postalCode) {
      const errMessage = 'กรุณาระบุรหัสไปรษณีย์';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }

    const cleanAddress: ShippingAddress = {
      firstName,
      lastName,
      phone,
      addressLine1,
      subdistrict,
      district,
      province,
      postalCode,
    };

    const uid = auth.currentUser.uid;
    const userDocRef = doc(db, 'users', uid);

    try {
      await updateDoc(userDocRef, {
        defaultShippingAddress: cleanAddress,
        updatedAt: serverTimestamp(),
      });

      const refreshedSnap = await getDoc(userDocRef);
      if (refreshedSnap.exists()) {
        const docData = refreshedSnap.data();
        const refreshedProfile: CustomerProfile = {
          uid,
          email: docData.email || auth.currentUser.email || '',
          displayName: docData.displayName || auth.currentUser.displayName || '',
          firstName: docData.firstName || '',
          lastName: docData.lastName || '',
          phone: docData.phone || '',
          photoURL: docData.photoURL !== undefined ? docData.photoURL : (auth.currentUser.photoURL || null),
          role: docData.role || 'customer',
          status: docData.status || 'active',
          membershipTier: (docData.membershipTier as MembershipTier) || 'classic',
          completedOrderCount: typeof docData.completedOrderCount === 'number' ? docData.completedOrderCount : 0,
          lifetimeSpend: typeof docData.lifetimeSpend === 'number' ? docData.lifetimeSpend : 0,
          defaultShippingAddress: docData.defaultShippingAddress
            ? {
                firstName: docData.defaultShippingAddress.firstName || '',
                lastName: docData.defaultShippingAddress.lastName || '',
                phone: docData.defaultShippingAddress.phone || '',
                addressLine1: docData.defaultShippingAddress.addressLine1 || '',
                subdistrict: docData.defaultShippingAddress.subdistrict || '',
                district: docData.defaultShippingAddress.district || '',
                province: docData.defaultShippingAddress.province || '',
                postalCode: docData.defaultShippingAddress.postalCode || '',
              }
            : null,
          createdAt: docData.createdAt,
          updatedAt: docData.updatedAt,
        };
        setCustomerProfile(refreshedProfile);
      }
    } catch (fsErr: any) {
      console.error('[SOULMATE Auth] updateDefaultShippingAddress error:', fsErr);
      const errMessage = fsErr?.message || 'ไม่สามารถบันทึกที่อยู่จัดส่งในฐานข้อมูลได้ กรุณาลองใหม่อีกครั้ง';
      setAuthError(errMessage);
      throw new Error(errMessage);
    }
  };

  const refreshCustomerProfile = async (): Promise<CustomerProfile | null> => {
    if (!auth?.currentUser) return null;
    return loadCustomerProfile(auth.currentUser.uid, auth.currentUser);
  };

  const value: AuthContextType = {
    user,
    customerProfile,
    profileLoading,
    profileNotFound,
    profileError,
    loading,
    isAuthenticated: Boolean(user),
    isFirebaseConfigured,
    missingConfigKeys: missingKeys,
    pendingCustomerData,
    authError,
    adminAttemptRole,
    login,
    register,
    logout,
    resetPassword,
    adminLogin,
    uploadProfilePhoto,
    deleteProfilePhoto,
    updateCustomerProfile,
    updateDefaultShippingAddress,
    refreshCustomerProfile,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
