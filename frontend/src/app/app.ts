import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OcrService } from './services/ocr';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container">
      <header>
        <h1>GLM-OCR WebApp</h1>
      </header>

      <main>
        <div *ngIf="!documentId" class="upload-section">
          <input type="file" (change)="onFileSelected($event)" accept=".pdf,image/*">
          <p>Trascina o seleziona un file PDF o un'immagine</p>
        </div>

        <div *ngIf="documentId" class="viewer-section">
          <div class="controls">
            <button (click)="prevPage()" [disabled]="currentPage === 0">Precedente</button>
            <span>Pagina {{ currentPage + 1 }} di {{ pages.length }}</span>
            <button (click)="nextPage()" [disabled]="currentPage === pages.length - 1">Successiva</button>
            <button (click)="runOcr()" [disabled]="loading" class="ocr-btn">
              {{ loading ? 'Elaborazione...' : 'Esegui OCR' }}
            </button>
            <button (click)="reset()" class="reset-btn">Carica altro</button>
          </div>

          <div class="split-pane">
            <div class="pane left">
              <h3>Originale</h3>
              <div class="image-container">
                <img [src]="currentImageUrl" alt="Pagina originale">
              </div>
            </div>
            <div class="pane right">
              <h3>Markdown</h3>
              <div class="markdown-container">
                <pre *ngIf="!markdownResults[currentPage]">Fai clic su "Esegui OCR" per iniziare.</pre>
                <div class="markdown-content" *ngIf="markdownResults[currentPage]">
                   <textarea readonly>{{ markdownResults[currentPage] }}</textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  `,
  styles: [`
    .container { font-family: sans-serif; height: 100vh; display: flex; flex-direction: column; margin: 0; padding: 0; background-color: #1e1e1e; color: #d4d4d4; }
    header { background: #121212; color: #fff; padding: 1rem; text-align: center; border-bottom: 1px solid #333; }
    main { flex: 1; padding: 1rem; overflow: hidden; display: flex; flex-direction: column; }
    .upload-section { border: 2px dashed #444; padding: 5rem; text-align: center; margin-top: 2rem; border-radius: 8px; background: #252526; }
    .viewer-section { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
    .controls { padding: 0.5rem; background: #333; display: flex; gap: 1rem; align-items: center; justify-content: center; border-radius: 4px; border: 1px solid #444; }
    .controls span { color: #fff; }
    .split-pane { flex: 1; display: flex; gap: 1rem; overflow: hidden; margin-top: 1rem; }
    .pane { flex: 1; display: flex; flex-direction: column; border: 1px solid #444; padding: 0.5rem; overflow: hidden; border-radius: 4px; background: #252526; }
    .pane h3 { margin-top: 0; margin-bottom: 0.5rem; color: #aaa; font-size: 1rem; }
    .image-container { flex: 1; overflow: auto; background: #2d2d2d; display: flex; justify-content: center; border-radius: 2px; }
    .image-container img { max-width: 100%; height: auto; align-self: flex-start; box-shadow: 0 0 15px rgba(0,0,0,0.5); }
    .markdown-container { flex: 1; overflow: hidden; background: #1e1e1e; border-radius: 2px; }
    .markdown-content { height: 100%; }
    .markdown-container textarea { width: 100%; height: 100%; border: 1px solid #333; padding: 1rem; font-family: 'Consolas', 'Monaco', monospace; resize: none; background: #1e1e1e; color: #d4d4d4; box-sizing: border-box; }
    .ocr-btn { background: #2e7d32; color: white; border: none; padding: 0.5rem 1.5rem; cursor: pointer; border-radius: 4px; font-weight: bold; }
    .ocr-btn:hover { background: #1b5e20; }
    .reset-btn { background: #424242; color: white; border: none; padding: 0.5rem 1rem; cursor: pointer; border-radius: 4px; margin-left: auto; }
    .reset-btn:hover { background: #616161; }
    button:disabled { opacity: 0.3; cursor: not-allowed; }
    pre { padding: 2rem; color: #666; text-align: center; font-style: italic; }
    input[type="file"] { color: #aaa; }
  `]
})
export class App {
  documentId: string | null = null;
  pages: string[] = [];
  currentPage = 0;
  markdownResults: { [key: number]: string } = {};
  loading = false;

  constructor(private ocrService: OcrService) {
    console.log('App bootstrapped');
  }

  get currentImageUrl(): string {
    if (!this.documentId || !this.pages[this.currentPage]) return '';
    return this.ocrService.getImageUrl(this.documentId, this.pages[this.currentPage]);
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.ocrService.upload(file).subscribe({
        next: (res) => {
          this.documentId = res.document_id;
          this.pages = res.pages;
          this.currentPage = 0;
          this.markdownResults = {};
        },
        error: (err) => alert('Errore caricamento: ' + err.message)
      });
    }
  }

  nextPage() {
    if (this.currentPage < this.pages.length - 1) {
      this.currentPage++;
    }
  }

  prevPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  runOcr() {
    if (!this.documentId) return;
    this.loading = true;
    this.ocrService.getOcr(this.documentId, this.currentPage).subscribe({
      next: (res) => {
        this.markdownResults[this.currentPage] = res.markdown;
        this.loading = false;
      },
      error: (err) => {
        alert('Errore OCR: ' + err.message);
        this.loading = false;
      }
    });
  }

  reset() {
    this.documentId = null;
    this.pages = [];
    this.currentPage = 0;
    this.markdownResults = {};
  }
}
