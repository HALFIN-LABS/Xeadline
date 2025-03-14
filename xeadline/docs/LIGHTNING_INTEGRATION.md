# Lightning Integration for Xeadline

## Overview

This document addresses the question of whether Xeadline needs to run a Lightning node on its relay (wss://relay.xeadline.com) to implement zap functionality according to NIP-57.

## Understanding NIP-57 (Lightning Zaps)

NIP-57 defines how to implement Lightning Network payments (zaps) within the Nostr ecosystem. The key components are:

1. **Zap Request**: A kind 9734 event that is not published to relays but sent directly to the recipient's LNURL pay endpoint
2. **Zap Receipt**: A kind 9735 event that is published to relays after a payment is confirmed

## Lightning Node Requirements

### Does the Relay Need to Run a Lightning Node?

**No, the relay itself does not need to run a Lightning node to support zaps.**

The relay's primary function is to:
- Receive and store events (including zap receipts)
- Distribute events to clients
- Facilitate communication between users

The actual Lightning payment infrastructure operates independently from the relay. Here's how the zap flow works:

1. User A wants to zap User B
2. User A's client creates a zap request and sends it to User B's LNURL pay endpoint
3. User B's LNURL server (not the relay) generates a Lightning invoice
4. User A pays the invoice using their Lightning wallet
5. User B's LNURL server creates a zap receipt and publishes it to relays
6. The relay (wss://relay.xeadline.com) receives and distributes this zap receipt

### Who Needs Lightning Nodes?

1. **Users**: Need access to Lightning wallets (via WebLN, browser extensions, or external wallets)
2. **Recipients who want to receive zaps**: Need either:
   - An account with a Lightning service provider that supports LNURL and zaps
   - Their own Lightning node with LNURL server capabilities

## Implementation Approach for Xeadline

Based on the MVP implementation plan, Xeadline will:

1. **Integrate WebLN for browser wallet support**:
   - This allows users to connect existing Lightning wallets
   - No need for Xeadline to manage Lightning nodes for users

2. **Implement tipping functionality**:
   - Create UI for sending zaps
   - Generate proper zap request events
   - Handle zap receipts for display in the UI

3. **Add Lightning wallet connection status**:
   - Show when users have a Lightning wallet connected
   - Indicate when they're ready to send/receive zaps

## Options for Xeadline Users

Users will have several options for Lightning functionality:

1. **Use existing Lightning wallets** via WebLN (Alby, Wallet of Satoshi, etc.)
2. **Use Nostr-specific wallets** that support zaps (like Amethyst or Damus)
3. **Run their own Lightning nodes** and configure them for zaps (advanced users)

## Future Considerations

While not required for basic zap functionality, Xeadline might consider these options in the future:

1. **Optional Lightning Service Provider (LSP)**:
   - Offer a custodial Lightning service for users who don't have their own wallets
   - This would require running a Lightning node, but as a separate service, not on the relay

2. **Zap Receipt Verification**:
   - Add server-side verification of zap receipts
   - This doesn't require a Lightning node, just verification logic

## Conclusion

Xeadline does not need to run a Lightning node on its relay (wss://relay.xeadline.com) to implement zap functionality. The Lightning infrastructure operates independently from the Nostr relay infrastructure.

The planned approach of integrating with WebLN and existing Lightning wallets is the most straightforward and secure implementation, as it doesn't require Xeadline to manage users' funds or run complex Lightning infrastructure.

Users will be able to send and receive zaps using their preferred Lightning wallets, while the relay simply handles the communication of zap receipts between users.