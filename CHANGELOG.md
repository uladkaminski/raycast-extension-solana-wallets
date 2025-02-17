# Changelog

## [1.1.0] - 2024-03-19

### Added
- User preferences support:
  - Configurable default number of wallets
  - Option to include public keys by default
  - Customizable output format (CSV/JSON)
  - Optional history saving
- Wallet generation history with:
  - Session-based storage
  - View and manage past generations
  - Quick access to previous wallets
- JSON export format with:
  - Pretty-printed output
  - Separate private/public key copying
  - Structured data format

## [1.0.0] - 2024-02-17

### Added
- Initial release of the Solana Wallets Generator extension
- Bulk wallet generation capability with customizable count
- Option to include public keys in the output
- CSV format export functionality
- One-click copying for individual wallet keys
- Performance metrics display for generation time
- Clean and intuitive user interface
- Base58 encoding for private and public keys
- Secure wallet generation using @solana/web3.js

### Security
- Implemented secure key generation using Solana's official web3.js library
- Added warning messages about private key security
- Ensured all cryptographic operations are performed locally