export interface Medicao {
  tipo: string;
  valor: number;
  imageUrl?: string;
}

export interface PontoDeColeta {
  nome: string;
  medicoes: Medicao[];
}

export interface Area {
  nome: string;
  pontos_de_coleta: PontoDeColeta[];
}

export interface DataEntry {
  data: string;
  area: Area[];
}

export interface ReportData {
  cliente: string;
  cnpj_cpf?: string;
  endereco?: string;
  bairro?: string;
  cidade?: string;
  datas: DataEntry[];
}