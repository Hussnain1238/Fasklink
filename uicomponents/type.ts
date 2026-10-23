export type Payload = {
  name: string;
  email: string;
  password: string;
};

export type CompanyForm = { id: string; name: string };

 export type CustomerForm = {
  id: string;
  name: string;
  cnic: string;
  phone: string;
  whatsapp: string;
  address: string;
  notes: string;
  status: string;
  createdAt: string;
  companyId: string;
  packageName: string;
  fee: string;
  cost: string;
  startDate: string;
  paidThrough: string;
};
 
export type ConnectionForm = {
  customerId: string;
  connectionId: string;
  companyId: string;
  packageName: string;
  fee: string;
  cost: string;
  startDate: string;
  paidThrough: string;
};

export type PaymentForm = {
  customerId: string;
  connectionId: string;
  amount: string;
  date: string;
  method: string;
  note: string;
  settles: boolean;
};