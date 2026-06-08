import { buscarProduto } from './search';
import { SITES } from './sites';

function parseArgs(): { site: string; termo: string | null } {
  const args = process.argv.slice(2);
  let site = 'kabum';
  let termo: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--site' || args[i] === '-s') {
      site = args[++i] || site;
    } else if (!termo) {
      termo = args[i];
    }
  }

  return { site, termo };
}

export async function runCli(): Promise<void> {
    const { site, termo } = parseArgs();

    if (!termo) {
      console.log('Uso: npx tsx scraper.ts [--site kabum|terabyteshop] "nome do produto"');
      console.log('');
      console.log('Sites disponíveis:');
      Object.entries(SITES).forEach(([key, val]) => {
        console.log(`   ${key}  →  ${val.nome} (${val.urlBase})`);
      });
      console.log('');
      console.log('Exemplos:');
      console.log('   npx tsx scraper.ts "ryzen 5 5500"');
      console.log('   npx tsx scraper.ts --site terabyteshop "ryzen 5 5500"');
      console.log('   npx tsx scraper.ts -s terabyteshop "rx 7600"');
      process.exit(1);
    }

    if (!SITES[site]) {
      console.error(`❌ Site "${site}" não encontrado.`);
      console.error(`   Sites disponíveis: ${Object.keys(SITES).join(', ')}`);
      process.exit(1);
    }

    console.log(`\n🔍 Buscando por "${termo}" em ${SITES[site].nome}...\n`);
    const result = await buscarProduto(site, termo);

    if ('erro' in result && result.erro) {
      console.error(`❌ ${result.mensagem}`);
      return;
    }

    if (result.produtos.length === 0) {
      console.log(`❌ Nenhum produto encontrado para "${termo}" em ${SITES[site].nome}.`);
      return;
    }

    const melhor = result.produtos[0];
    const qtdPalavras = termo.split(/\s+/).length;
    console.log('═'.repeat(40));
    console.log(`🔍  ${SITES[site].nome}  |  ${termo}`);
    console.log('═'.repeat(40));
    console.log(`📌 Título: ${melhor.title}`);
    console.log(`💰 Preço:  ${melhor.price || 'N/A'}`);
    if (melhor.parcelamento) console.log(`💳 Parcelamento: ${melhor.parcelamento}`);
    console.log(`🔗 Link:   ${melhor.url}`);
    console.log(`📊 Score:   ${melhor.relevancia}/${qtdPalavras} palavras relevantes`);
    console.log('═'.repeat(40));

    if (result.produtos.length > 1) {
      console.log(`\n📋 Outros ${result.produtos.length - 1} resultado(s) (por relevância + preço):`);
      result.produtos.slice(1, Math.min(6, result.produtos.length)).forEach((p, i) => {
        const titleShort = p.title.length > 55 ? p.title.substring(0, 55) + '...' : p.title;
        const parc = p.parcelamento ? ` | ${p.parcelamento}` : '';
        console.log(`   ${i + 2}. ${titleShort} → ${p.price || 'N/A'}${parc}`);
      });
    }

    console.log(`\n💾 Resultado salvo em data/resultado.json (${result.produtos.length} produtos)`);
}
