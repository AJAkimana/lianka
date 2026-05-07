import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../modules/auth/guards/jwt-auth.guard';

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  getAll(@Req() req, @Query('page') page = 1, @Query('limit') limit = 30) {
    return this.notificationsService.getUserNotifications(
      req.user.id,
      +page,
      +limit,
    );
  }

  @Get('unread-count')
  getUnreadCount(@Req() req) {
    return this.notificationsService.getUnreadCount(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req) {
    return this.notificationsService.markRead(req.user.id, id);
  }

  @Post('mark-all-read')
  markAllRead(@Req() req) {
    return this.notificationsService.markAllRead(req.user.id);
  }
}
