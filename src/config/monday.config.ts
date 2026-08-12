import { registerAs } from '@nestjs/config';

export default registerAs('monday', () => ({
  apiToken: process.env.MONDAY_API_TOKEN ?? '',
  apiUrl: process.env.MONDAY_API_URL ?? 'https://api.monday.com/v2',
  boardId: process.env.MONDAY_BOARD_ID ?? '9150513634',
  groupId: process.env.MONDAY_GROUP_ID ?? 'new_group29179',
}));
