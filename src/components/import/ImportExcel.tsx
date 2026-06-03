import { useState, useRef } from 'react';
import { useImportExcel } from '@/hooks/useImportExcel';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2, Download, BookOpen, AlertCircle, CheckCheck } from 'lucide-react';
import { toast } from 'sonner';
// xlsx is loaded dynamically inside downloadTemplate to keep it out of the main bundle

// Template columns definition
const TEMPLATE_COLUMNS = [
  'Placa ou Serie',
  'Tag da Obra',
  'Última Atualização',
  'KM Atual',
  'Hora Atual',
  'Retorno ao Pátio',
  'Tipo de Revisão',
  'Data da Revisão',
  'KM da Revisão',
  'Hora da Revisão',
  'Intervalo',
  'Revisão Por',
  'Contrato',
  'Empresa',
];

// Example data for the template
const EXAMPLE_DATA = [
  {
    'Placa ou Serie': 'ABC-1234',
    'Tag da Obra': 'OBRA-001',
    'Última Atualização': '15/01/2026',
    'KM Atual': '45000',
    'Hora Atual': '1200',
    'Retorno ao Pátio': '20/01/2026',
    'Tipo de Revisão': 'Troca de Óleo',
    'Data da Revisão': '10/01/2026',
    'KM da Revisão': '40000',
    'Hora da Revisão': '',
    'Intervalo': '5000',
    'Revisão Por': 'Km',
    'Contrato': 'CONT-2026-001',
    'Empresa': 'Empresa ABC',
  },
  {
    'Placa ou Serie': 'XYZ-5678',
    'Tag da Obra': 'OBRA-002',
    'Última Atualização': '14/01/2026',
    'KM Atual': '',
    'Hora Atual': '3500',
    'Retorno ao Pátio': '',
    'Tipo de Revisão': 'Revisão Geral',
    'Data da Revisão': '01/01/2026',
    'KM da Revisão': '',
    'Hora da Revisão': '3000',
    'Intervalo': '500',
    'Revisão Por': 'Hr',
    'Contrato': 'CONT-2026-002',
    'Empresa': 'Empresa XYZ',
  },
];

export function ImportExcel() {
  const downloadTemplate = async () => {
    const XLSX = await import('xlsx');
    // Create workbook with template
    const wb = XLSX.utils.book_new();
    
    // Create worksheet with headers and example data
    const ws = XLSX.utils.json_to_sheet(EXAMPLE_DATA, { header: TEMPLATE_COLUMNS });
    
    // Set column widths
    ws['!cols'] = TEMPLATE_COLUMNS.map(() => ({ wch: 18 }));
    
    XLSX.utils.book_append_sheet(wb, ws, 'Dados da Frota');
    
    // Download
    XLSX.writeFile(wb, 'modelo_importacao_frota.xlsx');
    toast.success('Template baixado!', { description: 'Preencha os dados e importe novamente' });
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [importResult, setImportResult] = useState<{ success: number; errors: string[]; total: number } | null>(null);
  
  const { processFile, importData, isProcessing, progress, isImporting } = useImportExcel();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Formato inválido', { description: 'Selecione um arquivo Excel (.xlsx ou .xls)' });
      return;
    }

    setFile(selectedFile);
    setImportResult(null);

    try {
      const data = await processFile(selectedFile);
      setPreviewData(data.slice(0, 5)); // Show first 5 rows as preview
      toast.success('Arquivo carregado', { description: `${data.length} registros encontrados` });
    } catch (_error) {
      toast.error('Erro ao processar arquivo', { description: 'Verifique se o formato está correto' });
      setFile(null);
      setPreviewData(null);
    }
  };

  const handleImport = async () => {
    if (!file) return;

    try {
      const data = await processFile(file);
      const result = await importData({ rows: data, filename: file.name });
      setImportResult(result);
      
      if (result.errors.length === 0) {
        toast.success('Importação concluída!', { 
          description: `${result.success} veículos importados com sucesso` 
        });
      } else {
        toast.warning('Importação parcial', { 
          description: `${result.success} veículos importados, ${result.errors.length} erros` 
        });
      }
    } catch (_error) {
      toast.error('Erro na importação', { description: 'Tente novamente' });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile && droppedFile.name.match(/\.(xlsx|xls)$/i)) {
      const event = { target: { files: [droppedFile] } } as any;
      handleFileSelect(event);
    } else {
      toast.error('Formato inválido', { description: 'Selecione um arquivo Excel (.xlsx ou .xls)' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importar Planilha Excel
          </CardTitle>
          <CardDescription>
            Faça upload da sua planilha Excel com os dados da frota. 
            O sistema irá mapear automaticamente as colunas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors hover:border-primary hover:bg-muted/50"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-lg font-medium">
              Arraste o arquivo aqui ou clique para selecionar
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Formatos aceitos: .xlsx, .xls
            </p>
          </div>

          {file && (
            <div className="mt-4 p-4 bg-muted rounded-lg flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <Button onClick={handleImport} disabled={isProcessing || isImporting}>
                {isProcessing || isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Importando...
                  </>
                ) : (
                  'Importar Dados'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress */}
      {(isProcessing || isImporting) && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Processando...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview */}
      {previewData && previewData.length > 0 && !importResult && (
        <Card>
          <CardHeader>
            <CardTitle>Prévia dos Dados</CardTitle>
            <CardDescription>Primeiros 5 registros encontrados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Placa/Série</th>
                    <th className="text-left py-2 px-3">Tag da Obra</th>
                    <th className="text-left py-2 px-3">KM Atual</th>
                    <th className="text-left py-2 px-3">Hora Atual</th>
                    <th className="text-left py-2 px-3">Tipo Revisão</th>
                    <th className="text-left py-2 px-3">Empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, index) => (
                    <tr key={index} className="border-b last:border-0">
                      <td className="py-2 px-3 font-medium">{row.placa_serie}</td>
                      <td className="py-2 px-3">{row.tag_obra || '-'}</td>
                      <td className="py-2 px-3">{row.km_atual?.toLocaleString('pt-BR') || '0'}</td>
                      <td className="py-2 px-3">{row.hora_atual?.toLocaleString('pt-BR') || '0'}h</td>
                      <td className="py-2 px-3">{row.tipo_revisao || '-'}</td>
                      <td className="py-2 px-3">{row.empresa || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {importResult && (
        <div className="space-y-4">
          <Alert variant={importResult.errors.length === 0 ? 'default' : 'destructive'}>
            {importResult.errors.length === 0 ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertTitle>
              {importResult.errors.length === 0 ? 'Importação Concluída!' : 'Importação Parcial'}
            </AlertTitle>
            <AlertDescription>
              {importResult.success} veículos importados com sucesso
              {importResult.errors.length > 0 && ` • ${importResult.errors.length} erros`}
            </AlertDescription>
          </Alert>

          {importResult.errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-destructive">Erros na Importação</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-sm">
                  {importResult.errors.map((error, index) => (
                    <li key={index} className="text-muted-foreground">• {error}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Download Template */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Planilha Modelo
          </CardTitle>
          <CardDescription>
            Baixe o modelo padrão para garantir que seus dados sejam importados corretamente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button onClick={downloadTemplate} variant="default" className="gap-2">
              <Download className="h-4 w-4" />
              Baixar Planilha Modelo
            </Button>
            <p className="text-sm text-muted-foreground">
              O arquivo inclui exemplos de preenchimento para facilitar o entendimento
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Guia de Preenchimento
          </CardTitle>
          <CardDescription>
            Siga estas orientações para evitar erros na importação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="required">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Campos Obrigatórios
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">Placa ou Serie</p>
                    <p className="text-muted-foreground">Identificação única do veículo. Exemplo: ABC-1234 ou SERIE001</p>
                  </div>
                   <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">Tipo de Revisão</p>
                    <p className="text-muted-foreground">Nome da revisão. Exemplo: Troca de Óleo, Revisão Geral, Filtros</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">Intervalo</p>
                    <p className="text-muted-foreground">Frequência da revisão em Km ou Horas. Exemplo: 5000 (para 5000 Km)</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="font-medium">Revisão Por</p>
                    <p className="text-muted-foreground">Unidade do intervalo. Use: <strong>Km</strong> ou <strong>Hr</strong></p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="dates">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <CheckCheck className="h-4 w-4 text-primary" />
                  Formato de Datas
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>As datas devem estar em um dos formatos:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li><strong>DD/MM/AAAA</strong> - Exemplo: 15/01/2026</li>
                    <li><strong>MM/DD/AA</strong> - Exemplo: 01/15/26</li>
                    <li>Formato nativo do Excel (data selecionada na célula)</li>
                  </ul>
                  <Alert className="mt-3">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Evite formatar datas como texto. Use o formato de data do Excel.
                    </AlertDescription>
                  </Alert>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="numbers">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <CheckCheck className="h-4 w-4 text-primary" />
                  Formato de Números
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>Para KM, Horas e Intervalos:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Use apenas números inteiros: <strong>45000</strong></li>
                    <li>Pode usar separador de milhar: <strong>45.000</strong> ou <strong>45,000</strong></li>
                    <li>Não use unidades: evite "45000 km" ou "1200h"</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="multiple">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <CheckCheck className="h-4 w-4 text-primary" />
                  Múltiplas Revisões por Veículo
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <p>Para cadastrar várias revisões do mesmo veículo:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                    <li>Repita a placa em linhas diferentes</li>
                    <li>Altere apenas o Tipo de Revisão e dados específicos</li>
                    <li>O sistema agrupa automaticamente por veículo</li>
                  </ul>
                  <div className="mt-3 p-3 bg-muted rounded-lg">
                    <p className="font-medium mb-2">Exemplo:</p>
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1">Placa</th>
                          <th className="text-left py-1">Tipo Revisão</th>
                          <th className="text-left py-1">Intervalo</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b">
                          <td className="py-1">ABC-1234</td>
                          <td className="py-1">Troca de Óleo</td>
                          <td className="py-1">5000</td>
                        </tr>
                        <tr className="border-b">
                          <td className="py-1">ABC-1234</td>
                          <td className="py-1">Filtros</td>
                          <td className="py-1">10000</td>
                        </tr>
                        <tr>
                          <td className="py-1">ABC-1234</td>
                          <td className="py-1">Revisão Geral</td>
                          <td className="py-1">50000</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="tips">
              <AccordionTrigger className="text-left">
                <div className="flex items-center gap-2">
                  <CheckCheck className="h-4 w-4 text-primary" />
                  Dicas para Evitar Erros
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2 text-sm">
                  <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                    <li><strong>Não altere os nomes das colunas</strong> - O sistema usa os títulos exatos</li>
                    <li><strong>Remova linhas vazias</strong> - Podem causar erros de processamento</li>
                    <li><strong>Verifique acentuação</strong> - "Última Atualização" e "Revisão" têm acentos</li>
                    <li><strong>Evite caracteres especiais</strong> - Use apenas letras, números e hífens na placa</li>
                    <li><strong>Faça backup</strong> - Salve uma cópia da planilha original</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Column mapping info */}
      <Card>
        <CardHeader>
          <CardTitle>Mapeamento de Colunas</CardTitle>
          <CardDescription>O sistema reconhece automaticamente estas colunas da sua planilha</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {TEMPLATE_COLUMNS.map((col) => (
              <div key={col} className="p-2 bg-muted rounded text-center">
                {col}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
