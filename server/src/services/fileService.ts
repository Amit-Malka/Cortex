import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

interface FileQueryParams {
  page?: string | number;
  limit?: string | number;
  search?: string;
  sortBy?: string;
  order?: string;
}

interface PaginatedFilesResponse {
  files: Array<{
    id: string;
    name: string;
    mimeType: string;
    size: bigint;
    webViewLink: string;
    ownerEmail: string;
    ownerName: string;
    createdTime: Date;
    modifiedTime: Date;
    indexedAt: Date;
  }>;
  total: number;
  page: number;
  totalPages: number;
}

class FileService {
  async getUserFiles(userId: string, query: FileQueryParams): Promise<PaginatedFilesResponse> {
    const page = Math.max(1, parseInt(String(query.page || 1)));
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || 20))));
    const search = query.search?.trim();
    const sortBy = query.sortBy || 'modifiedTime';
    const order = query.order === 'asc' ? 'asc' : 'desc';

    const skip = (page - 1) * limit;

    const where: Prisma.FileWhereInput = {
      userId,
      ...(search && {
        name: {
          contains: search,
          mode: 'insensitive' as Prisma.QueryMode,
        },
      }),
    };

    const validSortFields = ['name', 'mimeType', 'size', 'modifiedTime', 'createdTime', 'indexedAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'modifiedTime';

    const orderBy: Prisma.FileOrderByWithRelationInput = {
      [orderByField]: order,
    };

    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          name: true,
          mimeType: true,
          size: true,
          webViewLink: true,
          ownerEmail: true,
          ownerName: true,
          createdTime: true,
          modifiedTime: true,
          indexedAt: true,
        },
      }),
      prisma.file.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      files,
      total,
      page,
      totalPages,
    };
  }
}

export default new FileService();
