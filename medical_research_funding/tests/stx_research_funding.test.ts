import { describe, expect, it } from "vitest";

describe('Medical Research Funding Smart Contract', () => {
  // Mock implementation of the contract
  const mockContract = {
    // Simulated state
    balances: new Map(),
    proposals: new Map(),
    admin: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
    researchFund: 'ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5',
    proposalCount: 0,

    // Mint tokens
    mint(recipient, amount) {
      // Only admin can mint
      if (this.admin !== this.getCurrentSender()) {
        throw new Error('Only admin can mint');
      }
      const currentBalance = this.balances.get(recipient) || 0;
      this.balances.set(recipient, currentBalance + amount);
      return amount;
    },

    // Transfer tokens
    transfer(amount, to) {
      const sender = this.getCurrentSender();
      const senderBalance = this.balances.get(sender) || 0;
      
      if (senderBalance < amount) {
        throw new Error('Insufficient balance');
      }
      
      // Deduct from sender
      this.balances.set(sender, senderBalance - amount);
      
      // Add to recipient
      const recipientBalance = this.balances.get(to) || 0;
      this.balances.set(to, recipientBalance + amount);
      
      return amount;
    },

    // Donate to research fund
    donate(amount) {
      const sender = this.getCurrentSender();
      const senderBalance = this.balances.get(sender) || 0;
      
      if (senderBalance < amount) {
        throw new Error('Insufficient balance');
      }
      
      // Deduct from sender
      this.balances.set(sender, senderBalance - amount);
      
      // Add to research fund
      const researchBalance = this.balances.get(this.researchFund) || 0;
      this.balances.set(this.researchFund, researchBalance + amount);
      
      return amount;
    },

    // Submit a funding proposal
    submitProposal(recipient, amount) {
      const id = this.proposalCount;
      this.proposals.set(id, {
        recipient,
        amount,
        votes: 0
      });
      this.proposalCount++;
      return id;
    },

    // Vote for a proposal
    vote(proposalId, voteWeight) {
      const sender = this.getCurrentSender();
      const senderBalance = this.balances.get(sender) || 0;
      
      if (senderBalance < voteWeight) {
        throw new Error('Not enough tokens to vote');
      }
      
      const proposal = this.proposals.get(proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }
      
      // Update proposal votes
      proposal.votes += voteWeight;
      this.proposals.set(proposalId, proposal);
      
      return voteWeight;
    },

    // Allocate funds
    allocateFunds(proposalId) {
      // Only admin can allocate
      if (this.admin !== this.getCurrentSender()) {
        throw new Error('Only admin can allocate');
      }
      
      const proposal = this.proposals.get(proposalId);
      if (!proposal) {
        throw new Error('Proposal not found');
      }
      
      const researchBalance = this.balances.get(this.researchFund) || 0;
      if (researchBalance < proposal.amount) {
        throw new Error('Insufficient funds in research fund');
      }
      
      // Deduct from research fund
      this.balances.set(this.researchFund, researchBalance - proposal.amount);
      
      // Add to recipient
      const recipientBalance = this.balances.get(proposal.recipient) || 0;
      this.balances.set(proposal.recipient, recipientBalance + proposal.amount);
      
      return proposal.amount;
    },

    // Get balance
    getBalance(who) {
      return this.balances.get(who) || 0;
    },

    // Get proposal
    getProposal(proposalId) {
      return this.proposals.get(proposalId);
    },

    // Current sender simulation (for testing)
    currentSender: null,
    
    // Set current sender for testing
    setCurrentSender(sender) {
      this.currentSender = sender;
    },
    
    // Get current sender
    getCurrentSender() {
      return this.currentSender || this.admin;
    }
  };

  describe('Token Minting', () => {
    it('should mint tokens for admin', () => {
      const recipient = 'ST2MEHXW3DRTMJ8BCDW8A4X4MRFFN7QLQETQNQCC2';
      const amount = 1000;
      
      mockContract.setCurrentSender(mockContract.admin);
      const result = mockContract.mint(recipient, amount);
      
      expect(result).toBe(amount);
      expect(mockContract.getBalance(recipient)).toBe(amount);
    });
    
    it('should prevent non-admin from minting', () => {
      const recipient = 'ST2MEHXW3DRTMJ8BCDW8A4X4MRFFN7QLQETQNQCC2';
      const amount = 1000;
      
      mockContract.setCurrentSender('ST3DWQZN9BVXZJWX4MXFYB8ZRJT9HFBQSB46K79Q');
      
      expect(() => mockContract.mint(recipient, amount)).toThrow('Only admin can mint');
    });
  });

  describe('Token Transfer', () => {
    it('should transfer tokens between accounts', () => {
      const sender = 'ST2MEHXW3DRTMJ8BCDW8A4X4MRFFN7QLQETQNQCC2';
      const recipient = 'ST3DWQZN9BVXZJWX4MXFYB8ZRJT9HFBQSB46K79Q';
      const amount = 500;
      
      // First mint tokens to sender
      mockContract.setCurrentSender(mockContract.admin);
      mockContract.mint(sender, 1000);
      
      // Transfer tokens
      mockContract.setCurrentSender(sender);
      const result = mockContract.transfer(amount, recipient);
      
      expect(result).toBe(amount);
      expect(mockContract.getBalance(sender)).toBe(500);
      expect(mockContract.getBalance(recipient)).toBe(amount);
    });
    
    it('should prevent transfer with insufficient balance', () => {
      const sender = 'ST2MEHXW3DRTMJ8BCDW8A4X4MRFFN7QLQETQNQCC2';
      const recipient = 'ST3DWQZN9BVXZJWX4MXFYB8ZRJT9HFBQSB46K79Q';
      
      mockContract.setCurrentSender(sender);
      
      expect(() => mockContract.transfer(1000, recipient)).toThrow('Insufficient balance');
    });
  });

  describe('Donation', () => {
    it('should donate tokens to research fund', () => {
      const donor = 'ST2MEHXW3DRTMJ8BCDW8A4X4MRFFN7QLQETQNQCC2';
      const donationAmount = 500;
      
      // First mint tokens to donor
      mockContract.setCurrentSender(mockContract.admin);
      mockContract.mint(donor, 1000);
      
      // Donate
      mockContract.setCurrentSender(donor);
      const result = mockContract.donate(donationAmount);
      
      expect(result).toBe(donationAmount);
      expect(mockContract.getBalance(donor)).toBe(500);
      expect(mockContract.getBalance(mockContract.researchFund)).toBe(donationAmount);
    });
    
    it('should prevent donation with insufficient balance', () => {
      const donor = 'ST2MEHXW3DRTMJ8BCDW8A4X4MRFFN7QLQETQNQCC2';
      
      mockContract.setCurrentSender(donor);
      
      expect(() => mockContract.donate(1000)).toThrow('Insufficient balance');
    });
  });

  describe('Proposal Submission and Voting', () => {
    it('should submit a funding proposal', () => {
      const recipient = 'ST3DWQZN9BVXZJWX4MXFYB8ZRJT9HFBQSB46K79Q';
      const amount = 10000;
      
      const proposalId = mockContract.submitProposal(recipient, amount);
      
      expect(proposalId).toBe(0);
      const proposal = mockContract.getProposal(proposalId);
      expect(proposal).toEqual({
        recipient,
        amount,
        votes: 0
      });
    });
    
    it('should vote on a proposal', () => {
      const voter = 'ST2MEHXW3DRTMJ8BCDW8A4X4MRFFN7QLQETQNQCC2';
      const recipient = 'ST3DWQZN9BVXZJWX4MXFYB8ZRJT9HFBQSB46K79Q';
      const amount = 10000;
      const voteWeight = 500;
      
      // Mint tokens for voter
      mockContract.setCurrentSender(mockContract.admin);
      mockContract.mint(voter, 1000);
      
      // Submit proposal
      const proposalId = mockContract.submitProposal(recipient, amount);
      
      // Vote on proposal
      mockContract.setCurrentSender(voter);
      const result = mockContract.vote(proposalId, voteWeight);
      
      expect(result).toBe(voteWeight);
      const proposal = mockContract.getProposal(proposalId);
      expect(proposal.votes).toBe(voteWeight);
    });
    
    it('should prevent voting with insufficient tokens', () => {
      const voter = 'ST2MEHXW3DRTMJ8BCDW8A4X4MRFFN7QLQETQNQCC2';
      const recipient = 'ST3DWQZN9BVXZJWX4MXFYB8ZRJT9HFBQSB46K79Q';
      const amount = 10000;
      
      // Submit proposal
      const proposalId = mockContract.submitProposal(recipient, amount);
      
      mockContract.setCurrentSender(voter);
      
      expect(() => mockContract.vote(proposalId, 1000)).toThrow('Not enough tokens to vote');
    });
  });

  describe('Fund Allocation', () => {
    it('should allocate funds to a proposal', () => {
      const admin = mockContract.admin;
      const recipient = 'ST3DWQZN9BVXZJWX4MXFYB8ZRJT9HFBQSB46K79Q';
      const amount = 10000;
      
      // Mint tokens to research fund
      mockContract.setCurrentSender(admin);
      mockContract.mint(mockContract.researchFund, 20000);
      
      // Submit and vote on proposal
      const proposalId = mockContract.submitProposal(recipient, amount);
      
      // Allocate funds
      const result = mockContract.allocateFunds(proposalId);
      
      expect(result).toBe(amount);
      expect(mockContract.getBalance(recipient)).toBe(amount);
      expect(mockContract.getBalance(mockContract.researchFund)).toBe(10000);
    });
    
    it('should prevent non-admin from allocating funds', () => {
      const recipient = 'ST3DWQZN9BVXZJWX4MXFYB8ZRJT9HFBQSB46K79Q';
      const amount = 10000;
      
      // Submit proposal
      const proposalId = mockContract.submitProposal(recipient, amount);
      
      // Try to allocate as non-admin
      mockContract.setCurrentSender('ST2MEHXW3DRTMJ8BCDW8A4X4MRFFN7QLQETQNQCC2');
      
      expect(() => mockContract.allocateFunds(proposalId)).toThrow('Only admin can allocate');
    });
    
    it('should prevent allocation with insufficient research fund', () => {
      const admin = mockContract.admin;
      const recipient = 'ST3DWQZN9BVXZJWX4MXFYB8ZRJT9HFBQSB46K79Q';
      const amount = 10000;
      
      // Submit proposal
      const proposalId = mockContract.submitProposal(recipient, amount);
      
      // Try to allocate with no funds
      mockContract.setCurrentSender(admin);
      
      expect(() => mockContract.allocateFunds(proposalId)).toThrow('Insufficient funds in research fund');
    });
  });
});