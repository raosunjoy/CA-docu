import { ApolloServer } from '@apollo/server'
import { startServerAndCreateNextHandler } from '@as-integrations/next'
import { typeDefs } from './schema'
import { resolvers } from './resolvers'
import { auth } from '../auth'
import type { NextRequest } from 'next/server'

// GraphQL context type
export interface GraphQLContext {
  user?: {
    id: string
    email: string
    role: string
    organizationId: string
  }
  req: NextRequest
}

// Create Apollo Server instance
const server = new ApolloServer<GraphQLContext>({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  plugins: [
    // Add custom plugins for logging, caching, etc.
    {
      requestDidStart() {
        return {
          didResolveOperation(requestContext) {
            console.log('GraphQL Operation:', requestContext.request.operationName)
          },
          didEncounterErrors(requestContext) {
            console.error('GraphQL Errors:', requestContext.errors)
          }
        }
      }
    }
  ]
})

// Create the Next.js handler
export const handler = startServerAndCreateNextHandler<NextRequest, GraphQLContext>(
  server,
  {
    context: async (req: NextRequest): Promise<GraphQLContext> => {
      // Extract user from authentication
      let user
      try {
        user = await auth.getCurrentUser(req)
      } catch (error) {
        // User not authenticated - some queries might still be allowed
        console.log('GraphQL request without authentication')
      }

      return {
        user: user ? {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId
        } : undefined,
        req
      }
    }
  }
)

// Export the server for testing purposes
export { server }