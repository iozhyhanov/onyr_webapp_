export type ClaimStatus = 'new' | 'pending' | 'approved' | 'rejected'

export interface Claim {
  id: string
  customerName: string
  status: ClaimStatus
  type: string
  priority: 'low' | 'medium' | 'high'
  createdAt: Date
}