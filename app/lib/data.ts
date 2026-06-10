import { PrismaClient } from '@prisma/client';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
} from './definitions';
import { formatCurrency } from './utils';

const prisma = new PrismaClient();

export async function fetchRevenue() {
  try {
    return await prisma.revenue.findMany();
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}
export async function fetchLatestInvoices() {
  try {
    const [invoices, customers] = await Promise.all([
      prisma.invoice.findMany({
        take: 5,
        orderBy: {
          date: 'desc',
        },
      }),
      prisma.customer.findMany(),
    ]);

    return invoices.map((invoice) => {
      const customer = customers.find(
        (c) => c.id === invoice.customerId
      );

      return {
        id: invoice.id,
        name: customer?.name ?? '',
        email: customer?.email ?? '',
        image_url: customer?.image_url ?? '',
        amount: formatCurrency(invoice.amount),
      };
    });
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}
export async function fetchCardData() {
  try {
    const [
      numberOfInvoices,
      numberOfCustomers,
      paidInvoices,
      pendingInvoices,
    ] = await Promise.all([
      prisma.invoice.count(),
      prisma.customer.count(),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: 'paid' },
      }),
      prisma.invoice.aggregate({
        _sum: { amount: true },
        where: { status: 'pending' },
      }),
    ]);

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices: formatCurrency(
        paidInvoices._sum.amount ?? 0,
      ),
      totalPendingInvoices: formatCurrency(
        pendingInvoices._sum.amount ?? 0,
      ),
    };
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;

export async function fetchFilteredInvoices(
  query: string,
  currentPage: number,
) {
  const offset = (currentPage - 1) * ITEMS_PER_PAGE;

  try {
    const invoices = await prisma.invoice.findMany({
      skip: offset,
      take: ITEMS_PER_PAGE,
      orderBy: {
        date: 'desc',
      },
      include: {
        customer: true,
      },
    });

    return invoices.filter((invoice) => {
      const q = query.toLowerCase();

      return (
        invoice.customer.name.toLowerCase().includes(q) ||
        invoice.customer.email.toLowerCase().includes(q) ||
        invoice.amount.toString().includes(q) ||
        invoice.status.toLowerCase().includes(q) ||
        invoice.date.toISOString().includes(q)
      );
    });
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}
export async function fetchInvoicesPages(query: string) {
  try {
    const [invoices, customers] = await Promise.all([
      prisma.invoice.findMany(),
      prisma.customer.findMany(),
    ]);

    const filtered = invoices
      .map((invoice) => {
        const customer = customers.find(
          (c) => c.id === invoice.customerId
        );

        return {
          ...invoice,
          customer,
        };
      })
      .filter((invoice) => {
        const q = query.toLowerCase();

        return (
          invoice.customer?.name.toLowerCase().includes(q) ||
          invoice.customer?.email.toLowerCase().includes(q) ||
          invoice.amount.toString().includes(q) ||
          invoice.status.toLowerCase().includes(q) ||
          invoice.date.toISOString().includes(q)
        );
      });

    return Math.ceil(filtered.length / ITEMS_PER_PAGE);
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}
export async function fetchInvoiceById(id: string) {
  try {
    const invoice = await prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) return null;

    return {
      ...invoice,
      amount: invoice.amount / 100,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  try {
    return await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: 'asc',
      },
    });
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}
export async function fetchFilteredCustomers(query: string) {
  try {
    const [customers, invoices] = await Promise.all([
      prisma.customer.findMany(),
      prisma.invoice.findMany(),
    ]);

    return customers
      .filter((customer) => {
        const q = query.toLowerCase();

        return (
          customer.name.toLowerCase().includes(q) ||
          customer.email.toLowerCase().includes(q)
        );
      })
      .map((customer) => {
        const customerInvoices = invoices.filter(
          (invoice) => invoice.customerId === customer.id
        );

        const totalPending = customerInvoices
          .filter((invoice) => invoice.status === 'pending')
          .reduce((sum, invoice) => sum + invoice.amount, 0);

        const totalPaid = customerInvoices
          .filter((invoice) => invoice.status === 'paid')
          .reduce((sum, invoice) => sum + invoice.amount, 0);

        return {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          image_url: customer.image_url,
          total_invoices: customerInvoices.length,
          total_pending: formatCurrency(totalPending),
          total_paid: formatCurrency(totalPaid),
        };
      });
  } catch (error) {
    console.error(error);
    throw new Error('Failed to fetch customer table.');
  }
}
export async function getUser(email: string) {
  try {
    return await prisma.user.findUnique({
      where: { email },
    });
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}