import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { IsString, IsIn } from 'class-validator';
import { WithdrawalAddressService } from './withdrawal-address.service';

class UpdateAddressDto {
  @IsString()
  address: string;

  @IsString()
  @IsIn(['TRC20', 'BEP20'])
  network: string;
}

@ApiTags('withdrawal-addresses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class WithdrawalAddressController {
  constructor(private addressService: WithdrawalAddressService) {}

  @Get('withdrawal-addresses')
  getAddresses(@Req() req) {
    return this.addressService.getAddresses(req.user.id);
  }

  @Post('withdrawal-address')
  updateAddress(@Body() dto: UpdateAddressDto, @Req() req) {
    return this.addressService.updateAddress(
      req.user.id,
      dto.network,
      dto.address,
    );
  }
}
