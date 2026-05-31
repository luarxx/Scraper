export interface Produto {
  title: string;
  price: string | null;
  parcelamento: string | null;
  image: string;
  url: string;
  relevancia: number;
}

export interface Site {
  key: string;
  nome: string;
}

export interface ResultadoSucesso {
  termo: string;
  site: string;
  siteNome: string;
  timestamp: string;
  total: number;
  produtos: Produto[];
}

export interface ResultadoErro {
  erro: true;
  mensagem: string;
  termo: string;
  site: string;
  siteNome: string;
  timestamp: string;
  total: 0;
  produtos: [];
}

export type Resultado = ResultadoSucesso | ResultadoErro;
