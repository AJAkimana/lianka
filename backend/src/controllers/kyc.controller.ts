import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';
import { KycService } from '../modules/kyc/kyc.service';

@ApiTags('kyc')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('kyc')
export class KycController {
  constructor(private kycService: KycService) {}

  @Get('status')
  getStatus(@Req() req) {
    return this.kycService.getStatus(req.user.id);
  }

  @Post('submit')
  @UseInterceptors(
    FilesInterceptor('files', 3, {
      storage: diskStorage({
        destination: './uploads/kyc',
        filename: (req, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + path.extname(file.originalname));
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png)$/)) {
          cb(new BadRequestException('Only JPG/PNG images allowed'), false);
        } else {
          cb(null, true);
        }
      },
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async submit(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
    @Req() req,
  ) {
    return this.kycService.submit({
      userId: req.user.id,
      document_type: body.document_type,
      full_name: body.full_name,
      date_of_birth: body.date_of_birth,
      document_number: body.document_number,
      nationality: body.nationality,
      files,
    });
  }
}
