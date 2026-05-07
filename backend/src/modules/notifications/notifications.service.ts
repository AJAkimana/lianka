import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from '../../entities/notification.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private repo: Repository<Notification>,
  ) {}

  async create(dto: {
    user_id: string;
    type: string;
    title: string;
    message: string;
    dot_color?: string;
    is_critical?: boolean;
    metadata?: any;
  }) {
    return this.repo.save({
      user_id: dto.user_id,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      dot_color: dto.dot_color || 'green',
      is_critical: dto.is_critical || false,
      metadata: dto.metadata,
      is_read: false,
    });
  }

  async getUserNotifications(userId: string, page = 1, limit = 30) {
    const [items, total] = await this.repo.findAndCount({
      where: { user_id: userId },
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const unread_count = await this.repo.count({
      where: { user_id: userId, is_read: false },
    });
    return { items, total, unread_count, page, limit };
  }

  async markRead(userId: string, notificationId: string) {
    await this.repo.update(
      { id: notificationId, user_id: userId },
      { is_read: true },
    );
    return { message: 'Marked as read' };
  }

  async markAllRead(userId: string) {
    await this.repo.update({ user_id: userId, is_read: false }, { is_read: true });
    return { message: 'All notifications marked as read' };
  }

  async getUnreadCount(userId: string) {
    return this.repo.count({ where: { user_id: userId, is_read: false } });
  }
}
