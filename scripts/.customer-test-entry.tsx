import React from 'react';
import '../src/index.css';
import {createRoot} from 'react-dom/client';
import {MemoryRouter,Routes,Route} from 'react-router-dom';
import {AdminCustomersPage,AdminCustomerDetailPage} from '../src/components/AdminCustomersPage';
createRoot(document.getElementById('root')!).render(<MemoryRouter initialEntries={['/admin/customers']}><Routes><Route path='/admin/customers' element={<AdminCustomersPage/>}/><Route path='/admin/customers/:customerId' element={<AdminCustomerDetailPage/>}/></Routes></MemoryRouter>);
