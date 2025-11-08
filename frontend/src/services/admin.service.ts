import apiService from './api.service';

export interface DashboardStats {
  activeUsers: {
    value: number;
    trend: string;
  };
  teams: {
    value: number;
    trend: string;
  };
  knowledgeArticles: {
    value: number;
    trend: string;
  };
  pendingReviews: {
    value: number;
    trend: string;
  };
  totalUsers: number;
  companies: number;
  activeSessions: number;
  completedSessions: number;
}

export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  summary: string;
  updatedAt: string;
  status: string;
  totalChunks: number;
  companyName?: string;
  uploaderName: string;
}

export interface KnowledgeBaseArticlesResponse {
  articles: KnowledgeBaseArticle[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface KnowledgeBaseUploadResponse {
  knowledgeBase: {
    id: string;
    title: string;
    status: string;
    totalChunks: number;
    totalCharacters: number;
    fileType: string;
    createdAt: string;
  };
  chunksCreated: number;
  originalFileName: string;
}

class AdminService {
  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiService.get<any>('/admin/dashboard/stats');
    // API returns { activeUsers, teams, ... } directly in data
    return response as DashboardStats;
  }

  // Knowledge Base
  async getKnowledgeBaseArticles(params?: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<KnowledgeBaseArticlesResponse> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const response = await apiService.get<any>(
      `/admin/knowledge-base${queryString ? `?${queryString}` : ''}`
    );
    // API returns { articles, pagination } directly in data
    return response as KnowledgeBaseArticlesResponse;
  }

  async getKnowledgeBaseArticle(id: string): Promise<any> {
    return apiService.get(`/admin/knowledge-base/${id}`);
  }

  async updateKnowledgeBaseArticle(
    id: string,
    data: {
      description?: string;
      isActive?: boolean;
    }
  ): Promise<any> {
    return apiService.put(`/admin/knowledge-base/${id}`, data);
  }

  async deleteKnowledgeBaseArticle(id: string): Promise<void> {
    return apiService.delete(`/admin/knowledge-base/${id}`);
  }

  async uploadKnowledgeBaseFile(formData: FormData): Promise<KnowledgeBaseUploadResponse> {
    return apiService.postForm('/admin/knowledge-base/upload', formData);
  }
}

export default new AdminService();

