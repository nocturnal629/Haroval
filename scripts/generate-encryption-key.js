const crypto = require('crypto')

// Generate a new 32-byte encryption key and encode as base64
const key = crypto.randomBytes(32).toString('base64')

console.log('Generated encryption key:')
console.log(key)
console.log('\nAdd this to your .env file as:')
console.log(`ENCRYPTION_KEY=${key}`)
console.log('\n⚠️  Keep this key secure and never commit it to version control!')
