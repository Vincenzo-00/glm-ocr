import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OcrService {
  private apiUrl = 'http://localhost:8000';

  constructor(private http: HttpClient) { }

  upload(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/upload`, formData);
  }

  getOcr(documentId: string, pageIndex: number): Observable<any> {
    return this.http.post(`${this.apiUrl}/ocr`, {
      document_id: documentId,
      page_index: pageIndex
    });
  }

  getImageUrl(documentId: string, filename: string): string {
    return `${this.apiUrl}/image/${documentId}/${filename}`;
  }
}
