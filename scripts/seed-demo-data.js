const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Sample products data
const sampleProducts = [
  {
    title: "Chashi Chinigura Rice 1kg",
    description: "Premium quality chinigura rice, perfect for daily consumption",
    priceCents: 14500,
    slug: "chashi-chinigura-rice-1kg",
    stock: 50,
    status: "PUBLISHED",
    media: [
      {
        url: "https://images.unsplash.com/photo-1586201375761-83865001e544?w=400&h=300&fit=crop&crop=center",
        alt: "Chashi Chinigura Rice",
        kind: "IMAGE"
      }
    ]
  },
  {
    title: "Moog Dal Premium 1kg",
    description: "High quality moog dal, rich in protein and nutrients",
    priceCents: 14000,
    slug: "moog-dal-premium-1kg",
    stock: 75,
    status: "PUBLISHED",
    media: [
      {
        url: "https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400&h=300&fit=crop&crop=center",
        alt: "Moog Dal",
        kind: "IMAGE"
      }
    ]
  },
  {
    title: "Bashundhara Power Wash Detergent 1kg",
    description: "Powerful detergent for tough stains and deep cleaning",
    priceCents: 10800,
    slug: "bashundhara-power-wash-detergent-1kg",
    stock: 30,
    status: "PUBLISHED",
    media: [
      {
        url: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=400&h=300&fit=crop&crop=center",
        alt: "Bashundhara Detergent",
        kind: "IMAGE"
      }
    ]
  },
  {
    title: "Star Ship Soyabean Oil 5L",
    description: "Pure soyabean oil for cooking, rich in omega-3",
    priceCents: 90700,
    slug: "star-ship-soyabean-oil-5l",
    stock: 25,
    status: "PUBLISHED",
    media: [
      {
        url: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&h=300&fit=crop&crop=center",
        alt: "Soyabean Oil",
        kind: "IMAGE"
      }
    ]
  },
  {
    title: "Fresh Atta 2kg",
    description: "Freshly milled wheat flour for roti and bread",
    priceCents: 12000,
    slug: "fresh-atta-2kg",
    stock: 40,
    status: "PUBLISHED",
    media: [
      {
        url: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?w=400&h=300&fit=crop&crop=center",
        alt: "Fresh Atta",
        kind: "IMAGE"
      }
    ]
  },
  {
    title: "Rui Fish 1-1.5kg",
    description: "Fresh rui fish, perfect for curry and fry",
    priceCents: 33500,
    slug: "rui-fish-1-1-5kg",
    stock: 15,
    status: "PUBLISHED",
    media: [
      {
        url: "https://images.unsplash.com/photo-1544943910-4c1dc44aab44?w=400&h=300&fit=crop&crop=center",
        alt: "Rui Fish",
        kind: "IMAGE"
      }
    ]
  },
  {
    title: "Teer Sugar 1kg",
    description: "Pure white sugar for daily use",
    priceCents: 11000,
    slug: "teer-sugar-1kg",
    stock: 60,
    status: "PUBLISHED",
    media: [
      {
        url: "https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=300&fit=crop&crop=center",
        alt: "Teer Sugar",
        kind: "IMAGE"
      }
    ]
  },
  {
    title: "Marks Full Cream Milk Powder 1kg",
    description: "Rich and creamy milk powder for tea and coffee",
    priceCents: 87000,
    slug: "marks-full-cream-milk-powder-1kg",
    stock: 35,
    status: "PUBLISHED",
    media: [
      {
        url: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=400&h=300&fit=crop&crop=center",
        alt: "Marks Milk Powder",
        kind: "IMAGE"
      }
    ]
  },
  {
    title: "Seylon Family Blend Tea 400gm",
    description: "Premium blend tea for the perfect cup",
    priceCents: 18500,
    slug: "seylon-family-blend-tea-400gm",
    stock: 45,
    status: "PUBLISHED",
    media: [
      {
        url: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=300&fit=crop&crop=center",
        alt: "Seylon Tea",
        kind: "IMAGE"
      }
    ]
  },
  {
    title: "KaziFarms Kitchen Plain Paratha 1.3kg",
    description: "Ready-to-cook plain paratha, perfect for breakfast",
    priceCents: 27000,
    slug: "kazifarms-kitchen-plain-paratha-1-3kg",
    stock: 20,
    status: "PUBLISHED",
    media: [
      {
        url: "https://images.unsplash.com/photo-1565299624946-b28f40a0ca4b?w=400&h=300&fit=crop&crop=center",
        alt: "KaziFarms Paratha",
        kind: "IMAGE"
      }
    ]
  }
];

// Sample delivery agents
const sampleDeliveryAgents = [
  {
    name: "Karim Ahmed",
    phone: "+8801712345678",
    active: true
  },
  {
    name: "Rahim Khan",
    phone: "+8801712345679",
    active: true
  },
  {
    name: "Salam Mia",
    phone: "+8801712345680",
    active: true
  },
  {
    name: "Nurul Islam",
    phone: "+8801712345681",
    active: true
  }
];

// Sample customers
const sampleCustomers = [
  {
    name: "Fatima Begum",
    email: "fatima@example.com",
    phone: "+8801711111111",
    role: "CUSTOMER",
    status: "ACTIVE"
  },
  {
    name: "Mohammad Ali",
    email: "ali@example.com",
    phone: "+8801711111112",
    role: "CUSTOMER",
    status: "ACTIVE"
  },
  {
    name: "Rashida Khatun",
    email: "rashida@example.com",
    phone: "+8801711111113",
    role: "CUSTOMER",
    status: "ACTIVE"
  },
  {
    name: "Abdul Rahman",
    email: "abdul@example.com",
    phone: "+8801711111114",
    role: "CUSTOMER",
    status: "ACTIVE"
  }
];

async function seedDemoData() {
  try {
    console.log('🌱 Seeding demo data...');

    // Get super admin for product creation
    const superAdmin = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } });
    if (!superAdmin) {
      throw new Error('Super admin not found. Please run seed-sqlite.js first.');
    }

    // Create products
    console.log('📦 Creating products...');
    const createdProducts = [];
    for (const productData of sampleProducts) {
      const existing = await prisma.product.findUnique({
        where: { slug: productData.slug }
      });
      
      if (!existing) {
        const product = await prisma.product.create({
          data: {
            ...productData,
            createdById: superAdmin.id,
            media: {
              create: productData.media
            }
          }
        });
        createdProducts.push(product);
        console.log(`✅ Created product: ${product.title}`);
      } else {
        createdProducts.push(existing);
        console.log(`✅ Product already exists: ${existing.title}`);
      }
    }

    // Create delivery agents
    console.log('🚚 Creating delivery agents...');
    const createdAgents = [];
    for (const agentData of sampleDeliveryAgents) {
      const existing = await prisma.deliveryAgent.findFirst({
        where: { phone: agentData.phone }
      });
      
      if (!existing) {
        const agent = await prisma.deliveryAgent.create({
          data: agentData
        });
        createdAgents.push(agent);
        console.log(`✅ Created delivery agent: ${agent.name}`);
      } else {
        createdAgents.push(existing);
        console.log(`✅ Delivery agent already exists: ${existing.name}`);
      }
    }

    // Create customers
    console.log('👥 Creating customers...');
    const createdCustomers = [];
    for (const customerData of sampleCustomers) {
      const existing = await prisma.user.findUnique({
        where: { email: customerData.email }
      });
      
      if (!existing) {
        const hashedPassword = await bcrypt.hash('Customer123!', 10);
        const customer = await prisma.user.create({
          data: {
            ...customerData,
            passwordHash: hashedPassword
          }
        });
        createdCustomers.push(customer);
        console.log(`✅ Created customer: ${customer.name}`);
      } else {
        createdCustomers.push(existing);
        console.log(`✅ Customer already exists: ${existing.name}`);
      }
    }

    // Create sample orders with different statuses
    console.log('📋 Creating sample orders...');
    
    // Get a call agent for assignment
    const callAgent = await prisma.user.findFirst({
      where: { role: 'CALL_AGENT' }
    });

    if (callAgent && createdCustomers.length > 0 && createdProducts.length > 0) {
      // Order 1: PENDING (needs call assignment)
      const order1 = await prisma.order.create({
        data: {
          orderNumber: 1001,
          status: 'PENDING',
          totalCents: 14500 + 14000, // Rice + Dal
          customerId: createdCustomers[0].id,
          items: {
            create: [
              {
                productId: createdProducts[0].id,
                quantity: 1,
                unitPriceCents: createdProducts[0].priceCents
              },
              {
                productId: createdProducts[1].id,
                quantity: 1,
                unitPriceCents: createdProducts[1].priceCents
              }
            ]
          }
        }
      });
      console.log(`✅ Created PENDING order: #${order1.orderNumber}`);

      // Order 2: CALL_ASSIGNED (needs call attempt)
      const order2 = await prisma.order.create({
        data: {
          orderNumber: 1002,
          status: 'CALL_ASSIGNED',
          totalCents: 10800 + 90700, // Detergent + Oil
          customerId: createdCustomers[1].id,
          callAssignedToId: callAgent.id,
          callAssignedById: (await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }))?.id,
          callAssignedAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
          items: {
            create: [
              {
                productId: createdProducts[2].id,
                quantity: 1,
                unitPriceCents: createdProducts[2].priceCents
              },
              {
                productId: createdProducts[3].id,
                quantity: 1,
                unitPriceCents: createdProducts[3].priceCents
              }
            ]
          }
        }
      });
      console.log(`✅ Created CALL_ASSIGNED order: #${order2.orderNumber}`);

      // Order 3: CALL_CONFIRMED (needs packing)
      const order3 = await prisma.order.create({
        data: {
          orderNumber: 1003,
          status: 'CALL_CONFIRMED',
          totalCents: 12000 + 33500, // Atta + Fish
          customerId: createdCustomers[2].id,
          callAssignedToId: callAgent.id,
          callAssignedById: (await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }))?.id,
          callAssignedAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
          callConfirmedAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          callNotes: "Customer confirmed order, wants fresh fish",
          items: {
            create: [
              {
                productId: createdProducts[4].id,
                quantity: 1,
                unitPriceCents: createdProducts[4].priceCents
              },
              {
                productId: createdProducts[5].id,
                quantity: 1,
                unitPriceCents: createdProducts[5].priceCents
              }
            ]
          }
        }
      });
      console.log(`✅ Created CALL_CONFIRMED order: #${order3.orderNumber}`);

      // Order 4: PACKED (needs delivery agent selection)
      const order4 = await prisma.order.create({
        data: {
          orderNumber: 1004,
          status: 'PACKED',
          totalCents: 11000 + 18500, // Sugar + Tea
          customerId: createdCustomers[3].id,
          callAssignedToId: callAgent.id,
          callAssignedById: (await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }))?.id,
          callAssignedAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          callConfirmedAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
          callNotes: "Customer confirmed, regular customer",
          items: {
            create: [
              {
                productId: createdProducts[6].id,
                quantity: 1,
                unitPriceCents: createdProducts[6].priceCents
              },
              {
                productId: createdProducts[7].id,
                quantity: 1,
                unitPriceCents: createdProducts[7].priceCents
              }
            ]
          }
        }
      });
      console.log(`✅ Created PACKED order: #${order4.orderNumber}`);

      // Order 5: DELIVERY_AGENT_SELECTED (needs assignment)
      const order5 = await prisma.order.create({
        data: {
          orderNumber: 1005,
          status: 'DELIVERY_AGENT_SELECTED',
          totalCents: 87000 + 27000, // Milk + Paratha
          customerId: createdCustomers[0].id,
          callAssignedToId: callAgent.id,
          callAssignedById: (await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }))?.id,
          callAssignedAt: new Date(Date.now() - 8 * 60 * 60 * 1000), // 8 hours ago
          callConfirmedAt: new Date(Date.now() - 7 * 60 * 60 * 1000), // 7 hours ago
          callNotes: "Customer confirmed, wants morning delivery",
          selectedDeliveryAgentId: createdAgents[0].id,
          items: {
            create: [
              {
                productId: createdProducts[8].id,
                quantity: 1,
                unitPriceCents: createdProducts[8].priceCents
              },
              {
                productId: createdProducts[9].id,
                quantity: 1,
                unitPriceCents: createdProducts[9].priceCents
              }
            ]
          }
        }
      });
      console.log(`✅ Created DELIVERY_AGENT_SELECTED order: #${order5.orderNumber}`);

      // Order 6: DELIVERED (completed order)
      const order6 = await prisma.order.create({
        data: {
          orderNumber: 1006,
          status: 'DELIVERED',
          totalCents: 14500 + 11000, // Rice + Sugar
          customerId: createdCustomers[1].id,
          callAssignedToId: callAgent.id,
          callAssignedById: (await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN' } }))?.id,
          callAssignedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          callConfirmedAt: new Date(Date.now() - 23 * 60 * 60 * 1000), // 23 hours ago
          callNotes: "Customer confirmed, delivered successfully",
          selectedDeliveryAgentId: createdAgents[1].id,
          deliveryAgentId: createdAgents[1].id,
          items: {
            create: [
              {
                productId: createdProducts[0].id,
                quantity: 1,
                unitPriceCents: createdProducts[0].priceCents
              },
              {
                productId: createdProducts[6].id,
                quantity: 1,
                unitPriceCents: createdProducts[6].priceCents
              }
            ]
          }
        }
      });
      console.log(`✅ Created DELIVERED order: #${order6.orderNumber}`);

      // Create some call attempts for orders
      console.log('📞 Creating call attempts...');
      
      // Call attempt for order 2 (CALL_ASSIGNED)
      await prisma.callAttempt.create({
        data: {
          orderId: order2.id,
          agentId: callAgent.id,
          outcome: 'UNREACHABLE',
          notes: 'Customer phone was busy, will try again later'
        }
      });

      // Call attempt for order 3 (CALL_CONFIRMED)
      await prisma.callAttempt.create({
        data: {
          orderId: order3.id,
          agentId: callAgent.id,
          outcome: 'CONFIRMED',
          notes: 'Customer confirmed order, wants fresh fish'
        }
      });

      console.log('✅ Created call attempts');

      // Create status changes for orders
      console.log('📊 Creating status changes...');
      
      // Status changes for order 2
      await prisma.orderStatusChange.create({
        data: {
          orderId: order2.id,
          from: 'PENDING',
          to: 'CALL_ASSIGNED',
          changedById: superAdmin.id
        }
      });

      // Status changes for order 3
      await prisma.orderStatusChange.create({
        data: {
          orderId: order3.id,
          from: 'PENDING',
          to: 'CALL_ASSIGNED',
          changedById: superAdmin.id
        }
      });
      await prisma.orderStatusChange.create({
        data: {
          orderId: order3.id,
          from: 'CALL_ASSIGNED',
          to: 'CALL_CONFIRMED',
          changedById: callAgent.id
        }
      });

      console.log('✅ Created status changes');
    }

    console.log('🎉 Demo data seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Products: ${createdProducts.length}`);
    console.log(`   Delivery Agents: ${createdAgents.length}`);
    console.log(`   Customers: ${createdCustomers.length}`);
    console.log(`   Sample Orders: 6 (different statuses)`);
    console.log('\n🔑 Demo Login Credentials:');
    console.log('   SUPER_ADMIN: admin@esternbazar.com / Admin123!');
    console.log('   ADMIN: admin@example.com / Admin123!');
    console.log('   CALL_AGENT: callagent@esternbazar.com / CallAgent123!');
    console.log('   CUSTOMER: fatima@example.com / Customer123!');

  } catch (error) {
    console.error('❌ Error seeding demo data:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedDemoData();
}

module.exports = { seedDemoData };
