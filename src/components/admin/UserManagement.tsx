'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/atoms/Card'
import { Button } from '@/components/atoms/Button'
import { Input } from '@/components/atoms/Input'
import { Badge } from '@/components/atoms/Badge'

interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'PARTNER' | 'MANAGER' | 'ASSOCIATE' | 'INTERN' | 'ADMIN'
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

interface UserManagementProps {
  className?: string
}

export const UserManagement: React.FC<UserManagementProps> = ({ className = '' }) => {
  const [users] = useState<User[]>([
    {
      id: '1',
      email: 'john.partner@example.com',
      firstName: 'John',
      lastName: 'Smith',
      role: 'PARTNER',
      isActive: true,
      lastLoginAt: '2024-12-08T10:30:00Z',
      createdAt: '2024-01-15T09:00:00Z'
    },
    {
      id: '2',
      email: 'sarah.manager@example.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      role: 'MANAGER',
      isActive: true,
      lastLoginAt: '2024-12-08T09:15:00Z',
      createdAt: '2024-02-20T10:30:00Z'
    },
    {
      id: '3',
      email: 'mike.associate@example.com',
      firstName: 'Mike',
      lastName: 'Wilson',
      role: 'ASSOCIATE',
      isActive: true,
      lastLoginAt: '2024-12-07T16:45:00Z',
      createdAt: '2024-03-10T11:15:00Z'
    },
    {
      id: '4',
      email: 'emma.intern@example.com',
      firstName: 'Emma',
      lastName: 'Davis',
      role: 'INTERN',
      isActive: false,
      lastLoginAt: '2024-12-05T14:20:00Z',
      createdAt: '2024-06-01T08:00:00Z'
    }
  ])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState<string>('all')

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = selectedRole === 'all' || user.role === selectedRole

    return matchesSearch && matchesRole
  })

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'PARTNER': return 'primary'
      case 'MANAGER': return 'secondary'
      case 'ASSOCIATE': return 'info'
      case 'INTERN': return 'warning'
      case 'ADMIN': return 'success'
      default: return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  return (
    <div className={className}>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">User Management</h2>
        
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              type="text"
              placeholder="Search users by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Roles</option>
            <option value="PARTNER">Partner</option>
            <option value="MANAGER">Manager</option>
            <option value="ASSOCIATE">Associate</option>
            <option value="INTERN">Intern</option>
            <option value="ADMIN">Admin</option>
          </select>
          
          <Button variant="primary">
            Add User
          </Button>
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Login
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge variant={getRoleBadgeVariant(user.role)} size="sm">
                        {user.role}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={user.isActive ? 'success' : 'secondary'} 
                        size="sm"
                      >
                        {user.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt) : 'Never'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="sm">
                          Edit
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className={user.isActive ? 'text-red-600 hover:text-red-700' : 'text-green-600 hover:text-green-700'}
                        >
                          {user.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No users found matching your criteria.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
        <Card>
          <CardContent className="text-center py-4">
            <div className="text-2xl font-bold text-gray-900">{users.length}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="text-center py-4">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.isActive).length}
            </div>
            <div className="text-sm text-gray-600">Active Users</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="text-center py-4">
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === 'PARTNER').length}
            </div>
            <div className="text-sm text-gray-600">Partners</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="text-center py-4">
            <div className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.lastLoginAt && new Date(u.lastLoginAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
            </div>
            <div className="text-sm text-gray-600">Active This Week</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default UserManagement