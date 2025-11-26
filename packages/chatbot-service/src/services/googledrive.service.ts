import { google, drive_v3 } from 'googleapis';
import axios from 'axios';
import { Readable } from 'stream';

export class GoogleDriveService {
    private drive: drive_v3.Drive | null = null;
    private folderId: string;

    constructor() {
        this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
        this.inicializar();
    }

    private inicializar() {
        try {
            const serviceAccountJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

            if (!serviceAccountJson) {
                console.warn('⚠️ GOOGLE_SERVICE_ACCOUNT_JSON não configurado - uploads desabilitados');
                return;
            }

            const credentials = JSON.parse(serviceAccountJson);

            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/drive.file']
            });

            this.drive = google.drive({ version: 'v3', auth });
            console.log('✅ Google Drive Service inicializado');

        } catch (error) {
            console.error('❌ Erro ao inicializar Google Drive:', error);
        }
    }

    async uploadArquivo(
        urlOriginal: string,
        nomeCliente: string,
        tipoMidia: string
    ): Promise<string | null> {
        if (!this.drive) {
            console.warn('⚠️ Google Drive não inicializado - pulando upload');
            return null;
        }

        try {
            // 1. Criar pasta do cliente se não existir
            const pastaCliente = await this.criarOuObterPastaCliente(nomeCliente);

            // 2. Baixar arquivo da URL original
            const response = await axios.get(urlOriginal, {
                responseType: 'arraybuffer',
                timeout: 30000
            });

            // 3. Determinar extensão baseado no tipo
            const extensao = this.getExtensao(tipoMidia);
            const nomeArquivo = `${Date.now()}_${tipoMidia}${extensao}`;

            // 4. Fazer upload para o Google Drive
            const buffer = Buffer.from(response.data);
            const stream = Readable.from(buffer);

            const uploadResponse = await this.drive.files.create({
                requestBody: {
                    name: nomeArquivo,
                    parents: [pastaCliente]
                },
                media: {
                    mimeType: this.getMimeType(tipoMidia),
                    body: stream
                },
                fields: 'id, webViewLink'
            });

            const fileId = uploadResponse.data.id;
            const webViewLink = uploadResponse.data.webViewLink;

            console.log(`✅ Arquivo salvo no Drive: ${nomeArquivo} (${fileId})`);

            return webViewLink || `https://drive.google.com/file/d/${fileId}`;

        } catch (error) {
            console.error('❌ Erro ao fazer upload para Google Drive:', error);
            return null;
        }
    }

    private async criarOuObterPastaCliente(nomeCliente: string): Promise<string> {
        if (!this.drive) {
            return this.folderId;
        }

        try {
            // Sanitizar nome da pasta
            const nomePasta = nomeCliente.replace(/[^a-zA-Z0-9\s]/g, '').trim() || 'Cliente_Sem_Nome';

            // Verificar se pasta já existe
            const query = `name='${nomePasta}' and '${this.folderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`;

            const existing = await this.drive.files.list({
                q: query,
                fields: 'files(id, name)'
            });

            if (existing.data.files && existing.data.files.length > 0) {
                return existing.data.files[0].id!;
            }

            // Criar nova pasta
            const folder = await this.drive.files.create({
                requestBody: {
                    name: nomePasta,
                    mimeType: 'application/vnd.google-apps.folder',
                    parents: [this.folderId]
                },
                fields: 'id'
            });

            console.log(`📁 Pasta criada no Drive: ${nomePasta}`);
            return folder.data.id!;

        } catch (error) {
            console.error('❌ Erro ao criar pasta no Drive:', error);
            return this.folderId;
        }
    }

    private getExtensao(tipoMidia: string): string {
        const map: Record<string, string> = {
            'image': '.jpg',
            'image/jpeg': '.jpg',
            'image/png': '.png',
            'image/webp': '.webp',
            'document': '.pdf',
            'application/pdf': '.pdf',
            'audio': '.ogg',
            'video': '.mp4'
        };
        return map[tipoMidia] || '';
    }

    private getMimeType(tipoMidia: string): string {
        const map: Record<string, string> = {
            'image': 'image/jpeg',
            'image/jpeg': 'image/jpeg',
            'image/png': 'image/png',
            'image/webp': 'image/webp',
            'document': 'application/pdf',
            'application/pdf': 'application/pdf',
            'audio': 'audio/ogg',
            'video': 'video/mp4'
        };
        return map[tipoMidia] || 'application/octet-stream';
    }
}
