import { forwardRef } from 'react';
import { OrdemServico, TipoRevisao } from '@/types/fleet';
import { SUBCATEGORIAS, formatDateSafe } from './constants';
import logoMC from '@/assets/logo-mc-20anos.jpg';

type OrdemFull = OrdemServico & { tipo_revisao?: TipoRevisao | null };

interface Props {
  order: OrdemFull;
}

const COLORS = {
  navy: '#18233E',
  mc: '#2D3891',
  greenSeal: '#3CBA60',
  greenText: '#277A32',
  greenBg: '#E9F6EC',
  red: '#D0342C',
  redBg: '#FBEAE9',
  panel: '#F3F4F7',
  border: '#D6DAE2',
  muted: '#6C7482',
  text: '#20242C',
  white: '#FFFFFF',
};

export const InformeCard = forwardRef<HTMLDivElement, Props>(({ order }, ref) => {
  const isConcluida = order.status === 'concluida';
  const placa = order.veiculo?.placa_serie || '-';
  const tag = order.veiculo?.tag_obra || '-';
  const subcategoriaLabel =
    order.tipo_manutencao === 'corretiva'
      ? SUBCATEGORIAS.find((s) => s.value === order.subcategoria_corretiva)?.label || '-'
      : order.tipo_revisao?.nome || '-';

  const title = isConcluida ? 'INFORME DE LIBERAÇÃO' : 'INFORME DE MANUTENÇÃO';
  const sealText = isConcluida ? '✔ LIBERADO' : 'EM MANUTENÇÃO';
  const sealBg = isConcluida ? COLORS.greenSeal : COLORS.red;
  const stripText = isConcluida
    ? '✔ EQUIPAMENTO LIBERADO PARA RETORNO À OBRA'
    : 'EQUIPAMENTO EM MANUTENÇÃO';
  const stripBg = isConcluida ? COLORS.greenBg : COLORS.redBg;
  const stripColor = isConcluida ? COLORS.greenText : COLORS.red;

  const fontFamily = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  const Chip = ({ label, value }: { label: string; value: string }) => (
    <div
      style={{
        background: COLORS.white,
        border: `1px solid ${COLORS.border}`,
        borderRadius: 12,
        padding: '12px 16px',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 4, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontSize: 20, color: COLORS.text, fontWeight: 700, lineHeight: 1.2 }}>
        {value}
      </div>
    </div>
  );

  const Field = ({ label, value }: { label: string; value: string }) => (
    <div>
      <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 4, fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, color: COLORS.text, fontWeight: 600 }}>{value}</div>
    </div>
  );

  return (
    <div
      ref={ref}
      style={{
        width: 1080,
        background: COLORS.white,
        borderRadius: 24,
        overflow: 'hidden',
        fontFamily,
        color: COLORS.text,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
      }}
    >
      {/* Header */}
      <div
        style={{
          background: COLORS.navy,
          padding: '28px 36px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 24,
        }}
      >
        <div
          style={{
            background: COLORS.white,
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minWidth: 130,
            height: 80,
          }}
        >
          <img
            src={logoMC}
            alt="MC Terraplenagem"
            crossOrigin="anonymous"
            style={{ maxHeight: 64, maxWidth: 160, objectFit: 'contain' }}
          />
        </div>
        <div
          style={{
            flex: 1,
            color: COLORS.white,
            fontSize: 36,
            fontWeight: 800,
            letterSpacing: 0.5,
            textAlign: 'center',
          }}
        >
          {title}
        </div>
        <div
          style={{
            background: sealBg,
            color: COLORS.white,
            padding: '12px 20px',
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 18,
            whiteSpace: 'nowrap',
          }}
        >
          {sealText}
        </div>
      </div>

      {/* Chips */}
      <div style={{ background: COLORS.panel, padding: '24px 36px', display: 'flex', gap: 16 }}>
        <Chip label="EQUIPAMENTO (TAG)" value={tag} />
        <Chip
          label="HORÍMETRO ENTRADA"
          value={order.horimetro_entrada != null ? `${order.horimetro_entrada} h` : '-'}
        />
        <Chip
          label="KM ENTRADA"
          value={order.km_entrada != null ? `${order.km_entrada.toLocaleString('pt-BR')} km` : '-'}
        />
        <Chip label="STATUS" value={isConcluida ? 'Concluída' : 'Aberta'} />
      </div>

      {/* Identificação */}
      <div style={{ padding: '12px 36px 0' }}>
        <div
          style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: COLORS.mc,
              fontWeight: 700,
              letterSpacing: 1,
              marginBottom: 16,
            }}
          >
            IDENTIFICAÇÃO DO EQUIPAMENTO
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <Field label="Placa / Série" value={placa} />
            <Field label="TAG da Obra" value={tag} />
            <Field
              label="Tipo de Manutenção"
              value={order.tipo_manutencao === 'corretiva' ? 'Corretiva' : 'Preventiva'}
            />
            <Field
              label={order.tipo_manutencao === 'corretiva' ? 'Subcategoria' : 'Tipo de Revisão'}
              value={subcategoriaLabel}
            />
            <Field label="Avarias" value={order.tem_avarias ? 'Sim' : 'Não'} />
            <Field label="Empresa" value="MC Terraplenagem" />
          </div>
        </div>
      </div>

      {/* Dados Manutenção */}
      <div style={{ padding: '20px 36px 0' }}>
        <div
          style={{
            background: COLORS.panel,
            border: `1px solid ${COLORS.border}`,
            borderRadius: 16,
            padding: 24,
          }}
        >
          <div
            style={{
              fontSize: 14,
              color: COLORS.mc,
              fontWeight: 700,
              letterSpacing: 1,
              marginBottom: 16,
            }}
          >
            DADOS DA MANUTENÇÃO
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
            <Field label="Data de Entrada" value={formatDateSafe(order.data_entrada)} />
            <Field
              label="KM Entrada"
              value={order.km_entrada != null ? order.km_entrada.toLocaleString('pt-BR') : '-'}
            />
            <Field
              label="Horímetro Entrada"
              value={order.horimetro_entrada != null ? `${order.horimetro_entrada} h` : '-'}
            />
            <Field label="Previsão de Saída" value={formatDateSafe(order.previsao_saida)} />
            {order.data_saida && (
              <Field label="Data de Saída" value={formatDateSafe(order.data_saida)} />
            )}
          </div>
        </div>
      </div>

      {/* Status strip */}
      <div style={{ padding: '24px 36px' }}>
        <div
          style={{
            background: stripBg,
            color: stripColor,
            borderRadius: 12,
            padding: '20px 24px',
            textAlign: 'center',
            fontWeight: 800,
            fontSize: 22,
            letterSpacing: 0.5,
          }}
        >
          {stripText}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          background: COLORS.navy,
          color: COLORS.white,
          textAlign: 'center',
          padding: '20px 36px',
          fontSize: 16,
          fontWeight: 700,
          letterSpacing: 0.5,
        }}
      >
        MANUTENÇÃO PREVENTIVA E SEGURANÇA É PRODUTIVIDADE! FAÇA SUA PARTE, ZELE PELO EQUIPAMENTO.
      </div>
    </div>
  );
});

InformeCard.displayName = 'InformeCard';
