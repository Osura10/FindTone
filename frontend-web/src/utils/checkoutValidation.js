// Same rules as the backend (OrdersController) so the user sees problems before sending.
const DEMO_CARD = '1234123412341234';
export const validateCheckout = (form, now = new Date()) => {
  if (!form.fullName.trim() || !form.phone.trim() || !form.addressLine.trim() || !form.city.trim()) {
    return 'Full name, phone, address and city are required.';
  }
  const digits = form.phone.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 12) return 'Invalid Sri Lankan phone number.';
  if (form.paymentMethod !== 'CARD') return null;

  const number = form.card.number.replace(/[\s-]/g, '');
  if (number !== DEMO_CARD) return 'Invalid demo card number. Use 1234 1234 1234 1234.';
  if (!form.card.holderName.trim()) return 'Card holder name is required.';
  const match = /^(\d{2})\/(\d{2})$/.exec(form.card.expiry.trim());
  const month = match ? Number(match[1]) : 0;
  if (!match || month < 1 || month > 12) return 'Invalid expiry. Use MM/YY.';
  const year = 2000 + Number(match[2]);
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) return 'Card expired.';
  if (!/^\d{3}$/.test(form.card.cvv)) return 'Invalid CVV. It must be 3 digits.';
  return null;
};
