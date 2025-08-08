import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Create demo organization
  const organization = await prisma.organization.create({
    data: {
      name: 'Demo CA Firm',
      subdomain: 'demo-ca-firm',
      settings: {}
    }
  })

  console.log('✅ Created organization:', organization.name)

  // Create demo users with different roles
  const users = [
    {
      email: 'partner@demo-ca.com',
      firstName: 'Rajesh',
      lastName: 'Sharma',
      role: 'PARTNER' as const,
      password: 'demo123'
    },
    {
      email: 'manager@demo-ca.com',
      firstName: 'Priya',
      lastName: 'Patel',
      role: 'MANAGER' as const,
      password: 'demo123'
    },
    {
      email: 'associate@demo-ca.com',
      firstName: 'Amit',
      lastName: 'Kumar',
      role: 'ASSOCIATE' as const,
      password: 'demo123'
    },
    {
      email: 'intern@demo-ca.com',
      firstName: 'Sneha',
      lastName: 'Singh',
      role: 'INTERN' as const,
      password: 'demo123'
    }
  ]

  for (const userData of users) {
    const hashedPassword = await hashPassword(userData.password)
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        passwordHash: hashedPassword,
        organizationId: organization.id,
        isActive: true
      }
    })
    console.log(`✅ Created user: ${user.firstName} ${user.lastName} (${user.role})`)
  }

  // Create some demo tasks
  const partner = await prisma.user.findFirst({ where: { role: 'PARTNER' } })
  const manager = await prisma.user.findFirst({ where: { role: 'MANAGER' } })
  const associate = await prisma.user.findFirst({ where: { role: 'ASSOCIATE' } })

  if (partner && manager && associate) {
    const tasks = [
      {
        title: 'Complete GST Return Filing for ABC Ltd',
        description: 'Prepare and file GSTR-1, GSTR-3B for the month of December 2024',
        status: 'IN_PROGRESS' as const,
        priority: 'HIGH' as const,
        createdBy: partner.id,
        assignedTo: associate.id,
        dueDate: new Date('2025-01-15')
      },
      {
        title: 'Audit Planning for XYZ Company',
        description: 'Create audit plan and schedule for annual audit',
        status: 'TODO' as const,
        priority: 'MEDIUM' as const,
        createdBy: partner.id,
        assignedTo: manager.id,
        dueDate: new Date('2025-01-20')
      },
      {
        title: 'TDS Return Preparation',
        description: 'Prepare quarterly TDS return for Q3 2024-25',
        status: 'IN_REVIEW' as const,
        priority: 'HIGH' as const,
        createdBy: manager.id,
        assignedTo: associate.id,
        dueDate: new Date('2025-01-10')
      },
      {
        title: 'Client Meeting - Investment Advisory',
        description: 'Meet with client to discuss investment options and tax implications',
        status: 'TODO' as const,
        priority: 'LOW' as const,
        createdBy: partner.id,
        assignedTo: partner.id,
        dueDate: new Date('2025-01-25')
      }
    ]

    for (const taskData of tasks) {
      const task = await prisma.task.create({
        data: {
          ...taskData,
          organizationId: organization.id,
          metadata: {}
        }
      })
      console.log(`✅ Created task: ${task.title}`)
    }
  }

  // Create some demo tags
  const tags = [
    { name: 'GST', color: '#3B82F6', organizationId: organization.id },
    { name: 'Audit', color: '#EF4444', organizationId: organization.id },
    { name: 'TDS', color: '#10B981', organizationId: organization.id },
    { name: 'Compliance', color: '#F59E0B', organizationId: organization.id },
    { name: 'Advisory', color: '#8B5CF6', organizationId: organization.id }
  ]

  for (const tagData of tags) {
    const tag = await prisma.tag.create({
      data: tagData
    })
    console.log(`✅ Created tag: ${tag.name}`)
  }

  console.log('🎉 Database seeded successfully!')
  console.log('\n👤 Demo Users:')
  console.log('- Partner: partner@demo-ca.com / demo123')
  console.log('- Manager: manager@demo-ca.com / demo123')
  console.log('- Associate: associate@demo-ca.com / demo123')
  console.log('- Intern: intern@demo-ca.com / demo123')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })