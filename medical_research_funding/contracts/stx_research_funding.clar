;; title: Decentralized Medical Research Funding Smart Contract
;; version: 1.0.0
;; summary: A smart contract enabling decentralized funding for medical research
;; description: This smart contract allows donors to contribute tokens, researchers to submit funding proposals, and token holders to vote on proposals.

(define-fungible-token research-token)

;; Define admin and research fund wallet
(define-data-var admin principal 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM)
(define-data-var research-fund principal 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5)

;; Maps for storing balances and funding proposals
(define-map balances {owner: principal} {balance: uint})
(define-map proposals {id: uint} {recipient: principal, amount: uint, votes: uint})
(define-data-var proposal-count uint u0)

;; Helper function to get balance with default
(define-private (get-balance-or-default (owner principal))
    (default-to u0 (get balance (map-get? balances {owner: owner}))))

;; Mint tokens (only admin)
(define-public (mint (recipient principal) (amount uint))
    (begin
        (asserts! (is-eq tx-sender (var-get admin)) (err u1))
        (map-set balances {owner: recipient} {balance: amount})
        (ok amount)))

;; Transfer tokens
(define-public (transfer (amount uint) (to principal))
    (let ((sender-balance (get-balance-or-default tx-sender)))
        (if (>= sender-balance amount)
            (begin
                (map-set balances {owner: tx-sender} {balance: (- sender-balance amount)})
                (map-set balances {owner: to} {balance: (+ (get-balance-or-default to) amount)})
                (ok amount))
            (err u2))))

;; Donate to the research fund
(define-public (donate (amount uint))
    (let ((sender-balance (get-balance-or-default tx-sender)))
        (if (>= sender-balance amount)
            (begin
                (map-set balances {owner: tx-sender} {balance: (- sender-balance amount)})
                (map-set balances {owner: (var-get research-fund)} {balance: (+ (get-balance-or-default (var-get research-fund)) amount)})
                (ok amount))
            (err u3))))

;; Submit a funding proposal
(define-public (submit-proposal (recipient principal) (amount uint))
    (let ((id (var-get proposal-count)))
        (begin
            (map-set proposals {id: id} {recipient: recipient, amount: amount, votes: u0})
            (var-set proposal-count (+ id u1))
            (ok id))))

;; Vote for a proposal (only token holders)
(define-public (vote (proposal-id uint) (vote-weight uint))
    (let ((sender-balance (get-balance-or-default tx-sender)))
        (if (>= sender-balance vote-weight)
            (let ((current-proposal (unwrap! (map-get? proposals {id: proposal-id}) (err u8))))
                (begin
                    (map-set proposals {id: proposal-id} 
                        {
                            recipient: (get recipient current-proposal), 
                            amount: (get amount current-proposal), 
                            votes: (+ (get votes current-proposal) vote-weight)
                        }
                    )
                    (ok vote-weight)))
            (err u4))))

;; Allocate funds (only admin)
(define-public (allocate-funds (proposal-id uint))
    (let ((proposal (map-get? proposals {id: proposal-id})))
        (match proposal 
            proposal-data
            (let ((recipient (get recipient proposal-data))
                  (amount (get amount proposal-data))
                  (research-balance (get-balance-or-default (var-get research-fund))))
                (if (and (is-eq tx-sender (var-get admin)) (>= research-balance amount))
                    (begin
                        (map-set balances {owner: (var-get research-fund)} {balance: (- research-balance amount)})
                        (map-set balances {owner: recipient} {balance: (+ (get-balance-or-default recipient) amount)})
                        (ok amount))
                    (err u5)))
            (err u7))))

;; Get balance
(define-read-only (get-balance (who principal))
    (get-balance-or-default who))

;; Get proposal details
(define-read-only (get-proposal (proposal-id uint))
    (map-get? proposals {id: proposal-id}))