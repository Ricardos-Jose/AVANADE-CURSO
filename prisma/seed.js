const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const {
  invoices,
  customers,
  revenue,
  users,
} = require('../app/lib/placeholder-data.js');

const prisma = new PrismaClient();

async function seedUsers() {
  const data = await Promise.all(
    users.map(async (user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      password: await bcrypt.hash(user.password, 10),
    }))
  );

  await prisma.user.createMany({
    data,
    skipDuplicates: true,
  });

  console.log(`Seeded ${data.length} users`);
}

async function seedCustomers() {
  await prisma.customer.createMany({
    data: customers.map((customer) => ({
      id: customer.id,
      name: customer.name,
      email: customer.email,
      imageUrl: customer.image_url,
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${customers.length} customers`);
}

async function seedInvoices() {
  await prisma.invoice.createMany({
    data: invoices.map((invoice) => ({
      customerId: invoice.customer_id,
      amount: invoice.amount,
      status: invoice.status,
      date: new Date(invoice.date),
    })),
    skipDuplicates: true,
  });

  console.log(`Seeded ${invoices.length} invoices`);
}

async function seedRevenue() {
  await prisma.revenue.createMany({
    data: revenue,
    skipDuplicates: true,
  });

  console.log(`Seeded ${revenue.length} revenue`);
}

async function main() {
  await seedUsers();
  await seedCustomers();
  await seedInvoices();
  await seedRevenue();
}

main()
  .catch((err) => {
    console.error('Error seeding database:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });