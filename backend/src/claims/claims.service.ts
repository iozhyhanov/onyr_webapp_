import { Injectable } from '@nestjs/common'
import { Claim } from './claim.type'

@Injectable()
export class ClaimsService {
  private claims: Claim[] = []

  getAll() {
    return this.claims
  }

  create(data: Omit<Claim, 'id' | 'createdAt'>) {
    const newClaim: Claim = {
      id: Date.now().toString(),
      createdAt: new Date(),
      ...data,
    }

    this.claims.push(newClaim)
    return newClaim
  }
}