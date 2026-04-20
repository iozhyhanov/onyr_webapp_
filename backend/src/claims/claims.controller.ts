import { Controller, Get, Post, Body } from '@nestjs/common'
import { ClaimsService } from './claims.service'

@Controller('claims')
export class ClaimsController {
  constructor(private readonly service: ClaimsService) {}

  @Get()
  getAll() {
    return this.service.getAll()
  }

  @Post()
    create(@Body() body: any) {
  console.log('RECEIVED:', body)
  return this.service.create(body)

    }
}

