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

interface FileStatsResponse {
  totalStorage: string;
  fileCount: number;
  typeDistribution: Array<{
    mimeType: string;
    count: number;
    percentage: number;
  }>;
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

  async getUserStats(userId: string): Promise<FileStatsResponse> {
    const where = { userId };

    const [aggregateResult, fileCount, typeGroups] = await Promise.all([
      prisma.file.aggregate({
        where,
        _sum: {
          size: true,
        },
      }),
      prisma.file.count({ where }),
      prisma.file.groupBy({
        by: ['mimeType'],
        where,
        _count: {
          mimeType: true,
        },
        orderBy: {
          _count: {
            mimeType: 'desc',
          },
        },
      }),
    ]);

    const totalStorage = aggregateResult._sum.size?.toString() || '0';

    const sortedTypes = typeGroups
      .map(group => ({
        mimeType: group.mimeType,
        count: group._count.mimeType,
      }))
      .sort((a, b) => b.count - a.count);

    const topTypes = sortedTypes.slice(0, 5);
    const otherTypes = sortedTypes.slice(5);

    const typeDistribution = topTypes.map(type => ({
      mimeType: type.mimeType,
      count: type.count,
      percentage: fileCount > 0 ? Math.round((type.count / fileCount) * 100) : 0,
    }));

    if (otherTypes.length > 0) {
      const otherCount = otherTypes.reduce((sum, type) => sum + type.count, 0);
      typeDistribution.push({
        mimeType: 'Other',
        count: otherCount,
        percentage: fileCount > 0 ? Math.round((otherCount / fileCount) * 100) : 0,
      });
    }

    return {
      totalStorage,
      fileCount,
      typeDistribution,
    };
  }
}

export default new FileService();
