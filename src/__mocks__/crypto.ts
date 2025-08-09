// Mock crypto module for testing
export const encrypt = jest.fn((data: string) => `encrypted_${data}`)

export const decrypt = jest.fn((encryptedData: string) => {
  if (encryptedData.startsWith('encrypted_')) {
    return encryptedData.replace('encrypted_', '')
  }
  return 'mock_decrypted_access_token'
})