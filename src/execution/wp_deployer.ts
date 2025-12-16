import axios from 'axios';
import FormData from 'form-data';
import * as fs from 'fs';

interface WordPressCredentials {
  siteUrl: string;
  username: string;
  appPassword: string;
}

interface MediaUploadResult {
  id: number;
  url: string;
  alt_text: string;
}

interface PostData {
  title: string;
  content: string;
  status: 'draft' | 'publish';
  categories?: number[];
  tags?: number[];
  featured_media?: number;
  meta?: {
    _yoast_wpseo_title?: string;
    _yoast_wpseo_metadesc?: string;
    _rank_math_title?: string;
    _rank_math_description?: string;
  };
}

// WordPress REST API client for content deployment
export class WordPressDeployer {
  private credentials: WordPressCredentials;
  private apiBase: string;

  constructor(credentials: WordPressCredentials) {
    this.credentials = credentials;
    this.apiBase = `${credentials.siteUrl.replace(/\/$/, '')}/wp-json/wp/v2`;
  }

  // Get authentication headers
  private getAuthHeaders() {
    const auth = Buffer.from(`${this.credentials.username}:${this.credentials.appPassword}`).toString('base64');
    return {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json'
    };
  }

  // Upload media file to WordPress
  async uploadMedia(filePath: string, altText: string = ''): Promise<MediaUploadResult> {
    try {
      const form = new FormData();
      form.append('file', fs.createReadStream(filePath));
      form.append('alt_text', altText);

      const response = await axios.post(`${this.apiBase}/media`, form, {
        headers: {
          ...form.getHeaders(),
          'Authorization': `Basic ${Buffer.from(`${this.credentials.username}:${this.credentials.appPassword}`).toString('base64')}`
        }
      });

      return {
        id: response.data.id,
        url: response.data.source_url,
        alt_text: response.data.alt_text
      };
    } catch (error) {
      console.error('Media upload error:', error);
      throw error;
    }
  }

  // Create a new post
  async createPost(postData: PostData): Promise<any> {
    try {
      const response = await axios.post(`${this.apiBase}/posts`, postData, {
        headers: this.getAuthHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Post creation error:', error);
      throw error;
    }
  }

  // Update an existing post
  async updatePost(postId: number, postData: Partial<PostData>): Promise<any> {
    try {
      const response = await axios.put(`${this.apiBase}/posts/${postId}`, postData, {
        headers: this.getAuthHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Post update error:', error);
      throw error;
    }
  }

  // Get categories
  async getCategories(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.apiBase}/categories`, {
        headers: this.getAuthHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Categories fetch error:', error);
      return [];
    }
  }

  // Create category if it doesn't exist
  async createCategory(name: string, description: string = ''): Promise<number> {
    try {
      const response = await axios.post(`${this.apiBase}/categories`, {
        name: name,
        description: description
      }, {
        headers: this.getAuthHeaders()
      });

      return response.data.id;
    } catch (error) {
      console.error('Category creation error:', error);
      throw error;
    }
  }

  // Get tags
  async getTags(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.apiBase}/tags`, {
        headers: this.getAuthHeaders()
      });

      return response.data;
    } catch (error) {
      console.error('Tags fetch error:', error);
      return [];
    }
  }

  // Create tag if it doesn't exist
  async createTag(name: string): Promise<number> {
    try {
      const response = await axios.post(`${this.apiBase}/tags`, {
        name: name
      }, {
        headers: this.getAuthHeaders()
      });

      return response.data.id;
    } catch (error) {
      console.error('Tag creation error:', error);
      throw error;
    }
  }

  // Search existing posts for internal linking
  async searchPosts(query: string, limit: number = 10): Promise<any[]> {
    try {
      const response = await axios.get(`${this.apiBase}/posts`, {
        params: {
          search: query,
          per_page: limit,
          status: 'publish'
        },
        headers: this.getAuthHeaders()
      });

      return response.data.map((post: any) => ({
        id: post.id,
        title: post.title.rendered,
        url: post.link,
        excerpt: post.excerpt.rendered
      }));
    } catch (error) {
      console.error('Post search error:', error);
      return [];
    }
  }
}

// Utility function to deploy complete article
export async function deployArticle(
  credentials: WordPressCredentials,
  articleData: {
    title: string;
    content: string;
    images: Array<{ path: string; altText: string }>;
    categories: string[];
    tags: string[];
    seoTitle?: string;
    seoDescription?: string;
  }
): Promise<any> {
  const deployer = new WordPressDeployer(credentials);

  try {
    // 1. Upload images
    const uploadedImages: MediaUploadResult[] = [];
    for (const image of articleData.images) {
      const uploaded = await deployer.uploadMedia(image.path, image.altText);
      uploadedImages.push(uploaded);
    }

    // 2. Replace image placeholders in content
    let processedContent = articleData.content;
    uploadedImages.forEach((img, index) => {
      const placeholder = `[IMAGE_${index + 1}]`;
      const imgTag = `<img src="${img.url}" alt="${img.alt_text}" />`;
      processedContent = processedContent.replace(placeholder, imgTag);
    });

    // 3. Handle categories
    const existingCategories = await deployer.getCategories();
    const categoryIds: number[] = [];
    
    for (const catName of articleData.categories) {
      const existing = existingCategories.find(cat => cat.name.toLowerCase() === catName.toLowerCase());
      if (existing) {
        categoryIds.push(existing.id);
      } else {
        const newCatId = await deployer.createCategory(catName);
        categoryIds.push(newCatId);
      }
    }

    // 4. Handle tags
    const existingTags = await deployer.getTags();
    const tagIds: number[] = [];
    
    for (const tagName of articleData.tags) {
      const existing = existingTags.find(tag => tag.name.toLowerCase() === tagName.toLowerCase());
      if (existing) {
        tagIds.push(existing.id);
      } else {
        const newTagId = await deployer.createTag(tagName);
        tagIds.push(newTagId);
      }
    }

    // 5. Create the post
    const postData: PostData = {
      title: articleData.title,
      content: processedContent,
      status: 'draft',
      categories: categoryIds,
      tags: tagIds,
      featured_media: uploadedImages.length > 0 ? uploadedImages[0].id : undefined,
      meta: {
        _yoast_wpseo_title: articleData.seoTitle,
        _yoast_wpseo_metadesc: articleData.seoDescription,
        _rank_math_title: articleData.seoTitle,
        _rank_math_description: articleData.seoDescription
      }
    };

    const createdPost = await deployer.createPost(postData);

    return {
      success: true,
      postId: createdPost.id,
      postUrl: createdPost.link,
      uploadedImages: uploadedImages
    };

  } catch (error) {
    console.error('Article deployment error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}