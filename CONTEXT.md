# SOULMATE Domain Language

Vocabulary for SOULMATE product guidance, orders, and customer accounts.

## Language

**Product guidance assistant**:
A customer-facing conversational assistant that helps choose and compare products using information recorded in the store's published product catalog. Its guidance does not diagnose conditions or promise health outcomes.
_Avoid_: Medical adviser

**Recommendable product**:
A published product with a purchasable option currently in stock. An out-of-stock product may be mentioned separately for comparison but is not presented as available to buy.

**Unmatched request**:
A customer request for which no recommendable product meets all stated conditions. The assistant identifies the unmet conditions and asks which one the customer is willing to relax.

**Product goal**:
A customer's desired shopping outcome, such as increasing protein intake, that can be matched against catalog facts without treating a reported symptom as a diagnosis.

**Catalog fact**:
A value directly recorded in a product field. Its presence does not independently prove that the value is correct; a missing or placeholder value is unknown and cannot support a recommendation.

**Symptom request**:
A customer message describing a health symptom. The assistant does not match products to the symptom as a treatment and redirects the conversation toward general product goals when appropriate.

**Guidance conversation**:
The temporary exchange in which a visitor states product goals, refines preferences, and compares recommendations. It is not retained as a permanent customer record.

**Order**:
A confirmed record of a customer's selected products and purchase details, retained by SOULMATE whether the customer has a permanent account or checks out as a guest.

**Payment status**:
The state of collecting payment for an Order. “Successful” means the shop has received the money, including money collected by the carrier for a cash-on-delivery Order; it does not mean the parcel has been delivered.

**Fulfillment status**:
The state of preparing and sending an Order's parcel, tracked separately from its Payment status.

**Parcel label**:
A shop-generated sheet attached to a parcel with the recipient's delivery details and the Order's payment type. It shows the amount to collect, including the shipping fee, for cash-on-delivery Orders; prepaid Orders say that no money is due on delivery.

**Pending order**:
An Order that has been recorded and has stock reserved while waiting for payment. It is not a completed sale.

**Payment attempt**:
A request to a payment provider associated with an Order. Its result is tracked separately from the Order so a failed or uncertain request cannot be treated as a successful sale.

**Stock reservation**:
The quantity temporarily withheld from other orders while a Pending order can still be paid. It is released when that Order is paid, fails, or expires.

**Guest checkout**:
Placing an order without first signing in to or creating a permanent customer account. The buyer still provides the contact and delivery details needed to fulfil the order.

**Customer account**:
A persistent identity through which a customer manages personal details and views orders linked to that identity.
