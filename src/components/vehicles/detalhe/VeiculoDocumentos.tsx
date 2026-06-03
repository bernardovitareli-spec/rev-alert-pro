import { VeiculoComRevisoes, TipoDocumentoVeiculo } from '@/types/fleet';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentoVeiculoUpload } from '@/components/vehicles/DocumentoVeiculoUpload';
import { ValidadeDocumentoInput } from '@/components/vehicles/ValidadeDocumentoInput';
import { FileText, FileCheck, Timer, FileSignature } from 'lucide-react';

interface VeiculoDocumentosProps {
  veiculo: VeiculoComRevisoes;
  isUpdating: boolean;
  onDocumentoChange: (tipo: TipoDocumentoVeiculo, url: string | null) => Promise<void>;
  onValidadeChange: (tipo: 'crlv' | 'tacografo' | 'art', validade: string | null) => Promise<void>;
}

export function VeiculoDocumentos({
  veiculo,
  isUpdating,
  onDocumentoChange,
  onValidadeChange,
}: VeiculoDocumentosProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Documentos do Veículo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CRLV */}
          <Card className="border-2">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <FileCheck className="h-5 w-5 text-primary" />
                <span className="font-medium">CRLV</span>
              </div>
              <DocumentoVeiculoUpload
                veiculoId={veiculo.id}
                tipoDocumento="crlv"
                label="CRLV"
                value={veiculo.crlv_url || null}
                onChange={(url) => onDocumentoChange('crlv', url)}
                disabled={isUpdating}
              />
              <div className="mt-3">
                <label className="text-xs text-muted-foreground mb-1 block">Validade</label>
                <ValidadeDocumentoInput
                  value={veiculo.crlv_validade || null}
                  onChange={(v) => onValidadeChange('crlv', v)}
                  disabled={isUpdating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Tacógrafo */}
          <Card className="border-2">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <Timer className="h-5 w-5 text-primary" />
                <span className="font-medium">Tacógrafo</span>
              </div>
              <DocumentoVeiculoUpload
                veiculoId={veiculo.id}
                tipoDocumento="tacografo"
                label="Tacógrafo"
                value={veiculo.tacografo_url || null}
                onChange={(url) => onDocumentoChange('tacografo', url)}
                disabled={isUpdating}
              />
              <div className="mt-3">
                <label className="text-xs text-muted-foreground mb-1 block">Validade</label>
                <ValidadeDocumentoInput
                  value={veiculo.tacografo_validade || null}
                  onChange={(v) => onValidadeChange('tacografo', v)}
                  disabled={isUpdating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Nota Fiscal */}
          <Card className="border-2">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Nota Fiscal</span>
              </div>
              <DocumentoVeiculoUpload
                veiculoId={veiculo.id}
                tipoDocumento="documento"
                label="Documento"
                value={veiculo.documento_url || null}
                onChange={(url) => onDocumentoChange('documento', url)}
                disabled={isUpdating}
              />
            </CardContent>
          </Card>

          {/* ART */}
          <Card className="border-2">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 mb-3">
                <FileSignature className="h-5 w-5 text-primary" />
                <span className="font-medium">ART</span>
              </div>
              <DocumentoVeiculoUpload
                veiculoId={veiculo.id}
                tipoDocumento="art"
                label="ART"
                value={veiculo.art_url || null}
                onChange={(url) => onDocumentoChange('art', url)}
                disabled={isUpdating}
              />
              <div className="mt-3">
                <label className="text-xs text-muted-foreground mb-1 block">Validade</label>
                <ValidadeDocumentoInput
                  value={veiculo.art_validade || null}
                  onChange={(v) => onValidadeChange('art', v)}
                  disabled={isUpdating}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </CardContent>
    </Card>
  );
}
