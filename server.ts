import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API rotas
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Servir o catálogo público estruturado em HTML simples, perfeito para bots (GPT) e leitores de tela
  app.get('/catalogo', async (req, res) => {
    try {
      const firebaseConfig = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf-8')
      );
      const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

      // Buscar definições do site
      const settingsDoc = await getDoc(doc(db, 'settings', 'site'));
      const settings = settingsDoc.exists() ? settingsDoc.data() : {
        storeName: 'PDA COMERCIAL',
        storeDescription: 'Diversos para o seu dia-a-dia'
      };

      // Buscar produtos
      const productsSnap = await getDocs(collection(db, 'products'));
      const products: any[] = [];
      productsSnap.forEach((docSnap) => {
        products.push({ id: docSnap.id, ...docSnap.data() });
      });

      // Gerar HTML estático leve, sem JS, ideal para o GPT rastrear
      let productsHtml = '';
      products.forEach((p: any) => {
        const colors = p.attributes?.colors?.filter(Boolean).join(', ') || 'N / A';
        const sizes = p.attributes?.sizes?.filter(Boolean).join(', ') || 'N / A';
        
        productsHtml += `
          <div class="product-card" style="border: 1px solid #e4e4e7; border-radius: 16px; padding: 20px; margin-bottom: 20px; background-color: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <h2 style="margin: 0 0 10px 0; color: #ea580c; font-size: 1.3rem; font-weight: 700;">${p.name}</h2>
            <p style="color: #4b5563; margin: 0 0 16px 0; font-size: 0.95rem; line-height: 1.6;">${p.description || 'Sem descrição cadastrada.'}</p>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; font-size: 0.85rem; color: #6b7280; border-top: 1px solid #f4f4f5; padding-top: 12px;">
              <div><strong>Preço:</strong> KZ ${Number(p.price || 0).toLocaleString('pt-PT')}</div>
              <div><strong>Categoria:</strong> ${p.category || 'Geral'}</div>
              <div><strong>Cores:</strong> ${colors}</div>
              <div><strong>Tamanhos:</strong> ${sizes}</div>
            </div>
          </div>
        `;
      });

      const html = `
        <!DOCTYPE html>
        <html lang="pt">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Catálogo Completo - ${settings.storeName}</title>
          <meta name="description" content="${settings.storeDescription}">
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              line-height: 1.5;
              color: #18181b;
              background-color: #fafafa;
              margin: 0;
              padding: 40px 16px;
            }
            .container {
              max-width: 680px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 40px;
              padding-bottom: 30px;
              border-bottom: 1px solid #e4e4e7;
            }
            .header h1 {
              margin: 0 0 10px 0;
              color: #18181b;
              font-size: 2.2rem;
              font-weight: 800;
              letter-spacing: -0.025em;
            }
            .header p {
              color: #71717a;
              margin: 0;
              font-size: 1.1rem;
            }
            .footer {
              text-align: center;
              margin-top: 60px;
              font-size: 0.8rem;
              color: #a1a1aa;
              border-top: 1px solid #e4e4e7;
              padding-top: 30px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${settings.storeName}</h1>
              <p>${settings.storeDescription}</p>
            </div>
            
            <div class="products-list">
              ${productsHtml || '<p style="text-align: center; color: #71717a; padding: 40px;">Nenhum produto cadastrado no momento.</p>'}
            </div>
            
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${settings.storeName} - Todos os direitos reservados.</p>
              <p>Otimizado para leitura inteligente, robôs de busca (como o GPT) e leitores de ecrã.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.status(200).send(html);
    } catch (error) {
      console.error('Erro ao buscar o catálogo:', error);
      res.status(500).send('<html><body><h1>Erro ao carregar o catálogo</h1></body></html>');
    }
  });

  // Servir em JSON estruturado também (/api/catalogo)
  app.get('/api/catalogo', async (req, res) => {
    try {
      const firebaseConfig = JSON.parse(
        fs.readFileSync(path.join(__dirname, 'firebase-applet-config.json'), 'utf-8')
      );
      const firebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
      const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

      const productsSnap = await getDocs(collection(db, 'products'));
      const products: any[] = [];
      productsSnap.forEach((docSnap) => {
        products.push({ id: docSnap.id, ...docSnap.data() });
      });

      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.json({ success: true, count: products.length, products });
    } catch (error) {
      res.status(500).json({ success: false, error: String(error) });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
