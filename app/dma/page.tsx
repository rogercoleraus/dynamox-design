'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { DataGrid, GridColDef, GridToolbar } from '@mui/x-data-grid';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';

type SpotRow = {
  id: string;
  status?: string;
  laudo?: string;
  maquina?: string;
  subconjunto?: string;
  componente?: string;
  spot?: string;
  tendencia?: string;
  velocidadeMedia?: number;
  temperaturaMedia?: number;
  aceleracaoMediaA1?: number;
  aceleracaoMediaA2?: number;
  rota?: 'Rota José M.' | 'Rota João R.' | string;
};

type FetchParams = {
  page: number;
  pageSize: number;
  search?: string;
  sortField?: string;
  sortDirection?: 'asc' | 'desc';
  rota?: string | null;
};

function randomIn(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function generateMockRow(i: number): SpotRow {
  const status = i % 3 === 0 ? 'A2' : i % 3 === 1 ? 'A1' : 'A3';
  const maquina = 'FAB-PS04-PENEIRA';
  const subconjunto = '21MG_MESA GIRO';
  const componente = '29TL-MD_MANCAL';
  const laudo = 'MC DV02 LD CALDA';
  const temperaturaMedia = Number(randomIn(35, 80).toFixed(2));
  const velocidadeMedia = Number(randomIn(10, 90).toFixed(2));
  const aceleracaoMediaA1 = Number(randomIn(5, 50).toFixed(2));
  const aceleracaoMediaA2 = Number(randomIn(5, 50).toFixed(2));
  const tendencia = ['↗', '→', '↘'][i % 3];
  const rota = i % 2 ? 'Rota José M.' : 'Rota João R.';
  return {
    id: String(i + 1),
    status,
    laudo,
    maquina,
    subconjunto,
    componente,
    spot: `100${456 + (i % 10)}`,
    tendencia,
    velocidadeMedia,
    temperaturaMedia,
    aceleracaoMediaA1,
    aceleracaoMediaA2,
    rota,
  };
}

async function fetchSpots(params: FetchParams): Promise<{ rows: SpotRow[]; total: number }> {
  const total = 100;
  const all = Array.from({ length: total }, (_, i) => generateMockRow(i));

  let filtered = all;

  if (params.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter((r) =>
      [r.status, r.laudo, r.maquina, r.subconjunto, r.componente, r.spot, r.rota]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }

  if (params.rota) {
    filtered = filtered.filter((r) => r.rota === params.rota);
  }

  if (params.sortField) {
    const { sortField, sortDirection = 'asc' } = params;
    const dir = sortDirection === 'asc' ? 1 : -1;
    filtered = [...filtered].sort((a: any, b: any) => {
      const va = a[sortField as keyof SpotRow];
      const vb = b[sortField as keyof SpotRow];
      if (va == null && vb == null) return 0;
      if (va == null) return -1 * dir;
      if (vb == null) return 1 * dir;
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  const start = params.page * params.pageSize;
  const end = Math.min(start + params.pageSize, filtered.length);
  const rows = filtered.slice(start, end);

  return new Promise((resolve) => setTimeout(() => resolve({ rows, total: filtered.length }), 200));
}

export default function Page() {
  const [rows, setRows] = useState<SpotRow[]>([]);
  const [rowCount, setRowCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [search, setSearch] = useState('');
  const [rota, setRota] = useState<string | null>(null);
  const [sortModel, setSortModel] = useState<{ field?: string; sort?: 'asc' | 'desc' } | null>(null);

  const [autoRefreshSec, setAutoRefreshSec] = useState(25);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const columns = useMemo<GridColDef<SpotRow>[]>(
    () => [
      { field: 'status', headerName: 'Status', width: 100 },
      {
        field: 'maquina',
        headerName: 'Máquina',
        flex: 1,
        minWidth: 200,
        valueGetter: (v, r) => `${r.status ?? ''} | ${r.maquina ?? ''}`,
        sortComparator: (a, b) => String(a).localeCompare(String(b)),
      },
      { field: 'subconjunto', headerName: 'Subconjunto', flex: 1, minWidth: 180 },
      { field: 'componente', headerName: 'Componente', flex: 1, minWidth: 180 },
      { field: 'laudo', headerName: 'Laudo', flex: 1, minWidth: 180 },
      { field: 'spot', headerName: 'Spot', width: 140 },
      { field: 'tendencia', headerName: 'Tendência', width: 120 },
      { field: 'velocidadeMedia', headerName: 'Vel. Média', type: 'number', width: 130, valueFormatter: ({ value }) => value?.toFixed(2) },
      { field: 'temperaturaMedia', headerName: 'Temp. Média (Cº)', type: 'number', width: 170, valueFormatter: ({ value }) => value?.toFixed(2) },
      { field: 'aceleracaoMediaA1', headerName: 'Acel. Média A1', type: 'number', width: 150, valueFormatter: ({ value }) => value?.toFixed(2) },
      { field: 'aceleracaoMediaA2', headerName: 'Acel. Média A2', type: 'number', width: 150, valueFormatter: ({ value }) => value?.toFixed(2) },
      { field: 'rota', headerName: 'Rota', width: 160 },
    ],
    []
  );

  const load = useCallback(async () => {
    const { rows, total } = await fetchSpots({
      page,
      pageSize,
      search: search || undefined,
      sortField: sortModel?.field,
      sortDirection: sortModel?.sort,
      rota,
    });
    setRows(rows);
    setRowCount(total);
  }, [page, pageSize, search, sortModel?.field, sortModel?.sort, rota]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (isPaused) return;
    intervalRef.current = window.setInterval(() => {
      load();
    }, autoRefreshSec * 1000);
    return () => {
      if (intervalRef.current) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [autoRefreshSec, isPaused, load]);

  const selectedColumnsCount = columns.length;

  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Typography variant="h5">DMA</Typography>

      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
        <TextField
          size="small"
          placeholder="Pesquise por máquinas, spots, gateways, checklists..."
          value={search}
          onChange={(e) => {
            setPage(0);
            setSearch(e.target.value);
          }}
          sx={{ minWidth: 380 }}
        />

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="rota-label">Categorias: Rota</InputLabel>
          <Select
            labelId="rota-label"
            label="Categorias: Rota"
            value={rota ?? ''}
            onChange={(e) => {
              const value = e.target.value || null;
              setPage(0);
              setRota(value as string | null);
            }}
          >
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="Rota José M.">Rota José M.</MenuItem>
            <MenuItem value="Rota João R.">Rota João R.</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="ordenar-label">spots ordenados por</InputLabel>
          <Select
            labelId="ordenar-label"
            label="spots ordenados por"
            value={sortModel?.field ?? 'temperaturaMedia'}
            onChange={(e) => {
              const field = String(e.target.value);
              setSortModel((prev) => ({ field, sort: prev?.sort ?? 'desc' }));
            }}
          >
            <MenuItem value="temperaturaMedia">Temp. Média (Cº)</MenuItem>
            <MenuItem value="velocidadeMedia">Vel. Média</MenuItem>
            <MenuItem value="aceleracaoMediaA1">Acel. Média A1</MenuItem>
            <MenuItem value="aceleracaoMediaA2">Acel. Média A2</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="estrategia-label">Estratégia de manutenção</InputLabel>
          <Select labelId="estrategia-label" label="Estratégia de manutenção" defaultValue="100456">
            <MenuItem value="100456">100456</MenuItem>
          </Select>
        </FormControl>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip label={`Colunas Selecionadas: ${selectedColumnsCount}/23`} variant="outlined" />
          {/* Removido o GridToolbarColumnsButton fora do contexto */}
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center" ml="auto">
          <Typography variant="body2">Atualizando em {autoRefreshSec} segundos</Typography>
          <IconButton size="small" onClick={() => setIsPaused((p) => !p)}>
            {isPaused ? <PlayArrowIcon fontSize="small" /> : <PauseIcon fontSize="small" />}
          </IconButton>
          <TextField
            size="small"
            type="number"
            value={autoRefreshSec}
            onChange={(e) => setAutoRefreshSec(Math.max(5, Number(e.target.value) || 25))}
            sx={{ width: 90 }}
            inputProps={{ min: 5 }}
          />
        </Stack>
      </Stack>

      <Divider />

      <Box sx={{ height: 560, width: '100%' }}>
        <DataGrid
          rows={rows}
          columns={columns}
          rowCount={rowCount}
          paginationMode="server"
          sortingMode="server"
          onSortModelChange={(model) => {
            const m = model?.[0];
            setSortModel(m ?? null);
            setPage(0);
          }}
          sortModel={sortModel?.field ? [{ field: sortModel.field, sort: sortModel.sort }] : []}
          page={page}
          onPageChange={(newPage) => setPage(newPage)}
          pageSizeOptions={[10, 25, 50]}
          paginationModel={{ pageSize, page }}
          onPaginationModelChange={(m) => {
            setPage(m.page);
            setPageSize(m.pageSize);
          }}
          disableRowSelectionOnClick
          density="compact"
          sx={{
            '& .MuiDataGrid-columnHeaders': { fontWeight: 600 }
          }}
          slots={{
            toolbar: GridToolbar
          }}
        />
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" mt={1}>
          <Typography variant="body2">
            Linhas por página: {pageSize} — {rowCount === 0 ? '0-0' : `${page * pageSize + 1}-${Math.min((page + 1) * pageSize, rowCount)}`} de {rowCount}
          </Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
              Anterior
            </Button>
            <Button
              size="small"
              disabled={(page + 1) * pageSize >= rowCount}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Stack>
  );
}
