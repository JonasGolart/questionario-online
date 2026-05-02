import { normalizeQuestions, extractQuestionsFromRawJson } from '../apps/api/src/utils/questionNormalizer';
import fs from 'fs';

const jsonText = `
{
  "questions": [
    {
      "enunciado": "A densidade populacional de uma espécie pode ser estimada pelo método de captura-marcação-recaptura. Em uma área de 10 km², foram capturados, marcados e soltos 80 indivíduos de uma espécie de roedor. Em uma segunda coleta, capturaram-se 120 indivíduos, dos quais 30 estavam marcados. Qual é o tamanho populacional estimado e qual fator ecológico pode interferir diretamente na precisão desse método?",
      "alternativas": {
        "a": "320 indivíduos; migração de indivíduos para fora da área.",
        "b": "320 indivíduos; nascimentos e mortes durante o estudo.",
        "c": "240 indivíduos; dispersão ativa dos roedores.",
        "d": "240 indivíduos; uniformidade na distribuição espacial."
      },
      "resposta_correta": "a",
      "nivel": "Fácil"
    },
    {
      "enunciado": "Em ecologia de populações, a curva de sobrevivência Tipo III é característica de organismos que produzem muitas proles com alta mortalidade nos estágios iniciais de vida. Qual das seguintes espécies, conforme exemplos clássicos estudados, apresenta esse padrão e qual a consequência direta para a dinâmica populacional?",
      "alternativas": {
        "a": "Elefantes-marinhos, levando a uma população estável com poucos indivíduos idosos.",
        "b": "Ostras, resultando em alta fecundidade compensatória para garantir recrutamento.",
        "c": "Pássaros canoros, gerando curvas de sobrevivência intermediárias.",
        "d": "Humanos em países desenvolvidos, com baixa mortalidade infantil."
      },
      "resposta_correta": "b",
      "nivel": "Fácil"
    },
    {
      "enunciado": "A dispersão é um processo demográfico fundamental que afeta a distribuição espacial das populações. Em um fragmento florestal isolado por agricultura, espera-se que a dispersão de sementes por vertebrados frugívoros seja reduzida, afetando a regeneração natural. Qual é a consequência mais provável para as populações vegetais que dependem exclusivamente desse tipo de dispersão?",
      "alternativas": {
        "a": "Aumento da densidade populacional dentro do fragmento devido à falta de emigrantes.",
        "b": "Declínio da variabilidade genética e dificuldade de colonizar novas áreas.",
        "c": "Substituição por espécies anemocóricas com dispersão pelo vento mais eficiente.",
        "d": "Maior competição intraespecífica e redução na taxa de crescimento populacional."
      },
      "resposta_correta": "b",
      "nivel": "Fácil"
    },
    {
      "enunciado": "O fluxo anual de energia em um ecossistema é primariamente determinado pela produtividade primária bruta (PPB) e pela produtividade primária líquida (PPL). Em uma floresta tropical, a PPB é tipicamente alta, mas a PPL representa aproximadamente metade desse valor. O que explica essa diferença substancial?",
      "alternativas": {
        "a": "Grande parte da energia fotossintetizada é usada na respiração das plantas para manutenção e crescimento.",
        "b": "A alta decomposição recicla rapidamente os nutrientes, diminuindo a energia disponível.",
        "c": "O excesso de luminosidade inibe a fotossíntese, reduzindo a eficiência de conversão.",
        "d": "Consumidores primários consomem quase toda a biomassa vegetal antes da medição."
      },
      "resposta_correta": "a",
      "nivel": "Fácil"
    },
    {
      "enunciado": "A pirâmide de energia em um ecossistema sempre apresenta forma estritamente decrescente de um nível trófico para o próximo, pois a transferência de energia entre níveis é ineficiente. Em média, qual a porcentagem de energia transferida de um nível para o seguinte e qual processo é o principal responsável pela perda?",
      "alternativas": {
        "a": "90%; respiração celular dos organismos consumidores.",
        "b": "10%; calor dissipado na respiração e fezes não assimiladas.",
        "c": "50%; conversão de biomassa em estruturas não digeríveis.",
        "d": "1%; limitação por nutrientes inorgânicos."
      },
      "resposta_correta": "b",
      "nivel": "Fácil"
    },
    {
      "enunciado": "Em relação à matriz energética mundial, a participação de fontes renováveis tem crescido, mas ainda predomina o uso de combustíveis fósseis. Considerando a geração de eletricidade, qual fonte renovável teve o maior crescimento absoluto na última década e qual fator ainda limita sua expansão em grande escala?",
      "alternativas": {
        "a": "Solar fotovoltaica, intermitência e necessidade de armazenamento eficiente.",
        "b": "Eólica terrestre, alto custo de instalação e impacto visual.",
        "c": "Hidrelétrica de grande porte, esgotamento dos sítios adequados e impactos socioambientais.",
        "d": "Biomassa, competição com cultivos alimentares e baixa eficiência."
      },
      "resposta_correta": "a",
      "nivel": "Fácil"
    },
    {
      "enunciado": "A pegada ecológica é um indicador que mede a demanda humana sobre os ecossistemas. Um país com pegada ecológica maior que sua biocapacidade está em déficit ecológico. Qual das seguintes atividades humanas contribui mais diretamente para aumentar a pegada ecológica relacionada à energia, conforme análises típicas?",
      "alternativas": {
        "a": "Consumo de carne em dieta onívora.",
        "b": "Uso de carvão mineral para geração termelétrica.",
        "c": "Irrigação de cultivos agrícolas.",
        "d": "Construção de barragens hidrelétricas."
      },
      "resposta_correta": "b",
      "nivel": "Fácil"
    },
    {
      "enunciado": "A densidade populacional de uma espécie vegetal em uma área de 100 m² foi amostrada por quadrantes. Foram encontrados 4, 6, 5 e 9 indivíduos em quatro quadrantes de 1 m² cada. Qual a densidade estimada por hectare e qual padrão de distribuição espacial é sugerido pela variação entre quadrantes?",
      "alternativas": {
        "a": "60.000 indivíduos/ha; distribuição agregada.",
        "b": "24.000 indivíduos/ha; distribuição aleatória.",
        "c": "12.000 indivíduos/ha; distribuição uniforme.",
        "d": "6.000 indivíduos/ha; distribuição em mosaico."
      },
      "resposta_correta": "a",
      "nivel": "Fácil"
    },
    {
      "enunciado": "Em ecologia, a sucessão ecológica primária ocorre em ambientes sem solo pré-existente, como rochas nuas ou dunas. Durante os estágios iniciais, os organismos pioneiros desempenham um papel fundamental. Qual função ecológica desses organismos é mais crítica para permitir o avanço da sucessão?",
      "alternativas": {
        "a": "Produção de sombra para diminuir a temperatura local.",
        "b": "Fixação de nitrogênio e acúmulo de matéria orgânica inicial.",
        "c": "Polinização de plantas clímax futuras.",
        "d": "Predação de herbívoros que consumiriam a vegetação."
      },
      "resposta_correta": "b",
      "nivel": "Fácil"
    },
    {
      "enunciado": "O conceito de nicho ecológico difere de habitat: enquanto habitat é o local onde uma espécie vive, nicho refere-se ao papel funcional e às condições necessárias para sua persistência. O princípio de exclusão competitiva de Gause afirma que duas espécies não podem coexistir indefinidamente se ocuparem o mesmo nicho em um ambiente estável. Qual situação abaixo representa uma exceção aparente a esse princípio em ambientes naturais?",
      "alternativas": {
        "a": "Duas espécies de aves que comem exatamente as mesmas sementes, mas forrageiam em diferentes alturas da copa.",
        "b": "Duas espécies de bactérias que competem pelo mesmo açúcar em um meio homogêneo.",
        "c": "Dois predadores que caçam a mesma presa no mesmo horário e local.",
        "d": "Duas plantas que absorvem os mesmos nutrientes do solo com eficiência idêntica."
      },
      "resposta_correta": "a",
      "nivel": "Fácil"
    },
    {
      "enunciado": "O efeito estufa é um fenômeno natural essencial para a vida na Terra, mas sua intensificação pelo aumento de gases como CO₂ e metano causa aquecimento global. Na matriz energética, qual setor é o maior emissor direto de metano (CH₄) associado à produção de energia?",
      "alternativas": {
        "a": "Refino de petróleo.",
        "b": "Extração e transporte de gás natural.",
        "c": "Queima de biomassa em usinas termelétricas.",
        "d": "Fabricação de painéis solares fotovoltaicos."
      },
      "resposta_correta": "b",
      "nivel": "Fácil"
    },
    {
      "enunciado": "A produtividade primária líquida (PPL) varia entre ecossistemas. Recifes de coral e florestas tropicais apresentam as maiores PPLs do planeta. Qual fator comum a esses dois ecossistemas explica essa alta produtividade, apesar de um ser aquático e o outro terrestre?",
      "alternativas": {
        "a": "Baixas temperaturas o ano todo, reduzindo a respiração.",
        "b": "Alta disponibilidade de luz e temperaturas elevadas.",
        "c": "Solos profundos e ricos em nutrientes.",
        "d": "Grande biomassa de consumidores secundários."
      },
      "resposta_correta": "b",
      "nivel": "Fácil"
    },
    {
      "enunciado": "A energia eólica converte a energia cinética dos ventos em eletricidade. A potência extraível por uma turbina eólica é proporcional ao cubo da velocidade do vento. Se a velocidade do vento dobra, quantas vezes aumenta a potência disponível e qual fator geográfico mais influencia a viabilidade de parques eólicos?",
      "alternativas": {
        "a": "2 vezes; proximidade de rios.",
        "b": "4 vezes; altitude em relação ao nível do mar.",
        "c": "8 vezes; rugosidade do terreno e obstáculos.",
        "d": "16 vezes; latitude e ângulo de insolação."
      },
      "resposta_correta": "c",
      "nivel": "Fácil"
    },
    {
      "enunciado": "Em uma pirâmide de biomassa invertida, encontrada em alguns ecossistemas aquáticos, a biomassa dos produtores (fitoplâncton) pode ser menor que a dos consumidores primários (zooplâncton) em um determinado momento. Como isso é possível do ponto de vista do fluxo de energia?",
      "alternativas": {
        "a": "O fitoplâncton tem alta taxa de renovação (crescimento e reprodução rápidos), sustentando o zooplâncton mesmo com baixa biomassa instantânea.",
        "b": "O zooplâncton consome detritos orgânicos, não dependendo diretamente do fitoplâncton vivo.",
        "c": "A maior parte da biomassa do zooplâncton é composta de água, superestimando sua massa seca.",
        "d": "A energia solar é convertida diretamente pelo zooplâncton através de simbiontes."
      },
      "resposta_correta": "a",
      "nivel": "Fácil"
    },
    {
      "enunciado": "A capacidade suporte (K) de uma população é o número máximo de indivíduos que um ambiente pode sustentar indefinidamente. Se uma população de veados em uma ilha cresce inicialmente de forma exponencial e depois estabiliza próximo a K, qual fator denso-dependente é o mais provável de atuar no controle populacional perto da capacidade suporte?",
      "alternativas": {
        "a": "Tempestades ocasionais que matam indivíduos aleatoriamente.",
        "b": "Competição por alimentos, reduzindo a taxa de natalidade.",
        "c": "Secas periódicas independentes da densidade.",
        "d": "Erupções vulcânicas na ilha."
      },
      "resposta_correta": "b",
      "nivel": "Médio"
    },
    {
      "enunciado": "O modelo de crescimento logístico é descrito por dN/dt = rN (1 - N/K). Uma população de bactérias tem r = 0,5 por hora e K = 10.000 células em um meio. Quando N = 2.000 células, qual é a taxa de crescimento instantânea (dN/dt) e o que isso indica sobre o estágio da curva de crescimento?",
      "alternativas": {
        "a": "1.000 células/hora; fase de aceleração máxima.",
        "b": "800 células/hora; fase exponencial ainda não influenciada por K.",
        "c": "5.000 células/hora; fase de desaceleração.",
        "d": "4.000 células/hora; próxima da capacidade suporte."
      },
      "resposta_correta": "b",
      "nivel": "Médio"
    },
    {
      "enunciado": "A dispersão passiva de sementes por animais (zoocoria) pode ser afetada pela fragmentação de habitats. Um estudo em uma paisagem fragmentada mostrou que sementes de uma planta com frutos carnosos foram dispersadas apenas até 50 m da planta-mãe, enquanto em floresta contínua chegavam a 500 m. Qual é a explicação mais consistente para essa diferença, considerando a ecologia da dispersão?",
      "alternativas": {
        "a": "Extinção local dos dispersores frugívoros de grande porte nos fragmentos pequenos.",
        "b": "Mudança na fenologia da planta, que produz frutos em épocas distintas.",
        "c": "Aumento da predação de sementes no fragmento, reduzindo a viabilidade.",
        "d": "Maior competição com outras plantas zoocóricas no fragmento."
      },
      "resposta_correta": "a",
      "nivel": "Médio"
    },
    {
      "enunciado": "Na transferência de energia entre níveis tróficos, a eficiência de assimilação varia conforme o tipo de alimento. Herbívoros geralmente assimilam apenas 20-50% da energia ingerida de plantas, enquanto carnívoros assimilam cerca de 80% de suas presas. Qual componente da energia ingerida explica a menor eficiência de assimilação nos herbívoros?",
      "alternativas": {
        "a": "Maior gasto energético com termorregulação em herbívoros endotérmicos.",
        "b": "Presença de celulose e lignina nas paredes celulares vegetais, de difícil digestão.",
        "c": "Necessidade de buscar alimento em áreas abertas, com maior predação.",
        "d": "Menor número de mitocôndrias nas células intestinais de herbívoros."
      },
      "resposta_correta": "b",
      "nivel": "Médio"
    },
    {
      "enunciado": "Em um ecossistema lacustre eutrofizado, a produtividade primária é muito alta, mas a diversidade de peixes diminui drasticamente. O processo responsável por essa redução, após o aumento de nutrientes como fósforo, é a morte de peixes por hipóxia. Como a eutrofização leva à hipóxia no fundo do lago?",
      "alternativas": {
        "a": "O excesso de fitoplâncton bloqueia a luz, matando macrófitas aquáticas que produziam oxigênio.",
        "b": "A decomposição da grande biomassa de algas mortas consome oxigênio dissolvido.",
        "c": "Os peixes consomem todo o oxigênio disponível durante a alimentação intensa.",
        "d": "A alta temperatura da água causada pela eutrofização reduz a solubilidade do oxigênio."
      },
      "resposta_correta": "b",
      "nivel": "Médio"
    },
    {
      "enunciado": "A matriz energética brasileira destaca-se pelo alto percentual de fontes renováveis, especialmente hidrelétrica e biocombustíveis. No entanto, a geração termelétrica a partir de combustíveis fósseis é frequentemente acionada durante períodos de seca prolongada. Qual é a consequência ambiental direta dessa substituição temporária de fonte energética?",
      "alternativas": {
        "a": "Aumento da emissão de CO₂ e poluentes locais como material particulado.",
        "b": "Redução do nível dos reservatórios, afetando a recreação.",
        "c": "Contaminação de aquíferos por vazamento de óleo combustível.",
        "d": "Declínio da produção de etanol devido ao desvio de cana para termelétricas."
      },
      "resposta_correta": "a",
      "nivel": "Médio"
    },
    {
      "enunciado": "O ciclo do nitrogênio envolve processos microbianos como fixação, nitrificação, desnitrificação e amonificação. Em solos agricultáveis com uso intensivo de fertilizantes nitrogenados, ocorre frequentemente a lixiviação de nitrato (NO₃⁻), causando contaminação de lençóis freáticos. Qual processo biogeoquímico é inibido pela presença de oxigênio no solo, e que poderia converter o nitrato em N₂ atmosférico inofensivo?",
      "alternativas": {
        "a": "Fixação biológica do nitrogênio.",
        "b": "Desnitrificação.",
        "c": "Nitrificação.",
        "d": "Amonificação."
      },
      "resposta_correta": "b",
      "nivel": "Médio"
    },
    {
      "enunciado": "A energia geotérmica explora o calor interno da Terra, sendo uma fonte renovável de baixa emissão. Países como Islândia e Quênia possuem alta participação dessa fonte em sua matriz elétrica. Qual fator geológico é essencial para viabilizar economicamente a geração geotérmica de alta entalpia?",
      "alternativas": {
        "a": "Proximidade de limites de placas tectônicas com vulcanismo ativo.",
        "b": "Presença de largos rios para refrigeração das turbinas.",
        "c": "Rochas sedimentares porosas e permeáveis profundas.",
        "d": "Camadas de carvão mineral sob os aquíferos geotermais."
      },
      "resposta_correta": "a",
      "nivel": "Médio"
    },
    {
      "enunciado": "A maré motriz (energia maremotriz) utiliza o movimento das marés. Diferentemente das usinas hidrelétricas convencionais, as barragens de maré têm operação intermitente, com geração ocorrendo apenas durante certas fases. Qual é a principal limitação física para a expansão global da energia maremotriz?",
      "alternativas": {
        "a": "Necessidade de amplitudes de maré superiores a 5 metros, restritas a poucas regiões costeiras.",
        "b": "Alta salinidade corrói rapidamente as turbinas, inviabilizando a manutenção.",
        "c": "Impacto sobre a migração de aves marinhas e cetáceos, proibido em áreas protegidas.",
        "d": "Baixa previsibilidade das marés, tornando o planejamento energético inviável."
      },
      "resposta_correta": "a",
      "nivel": "Médio"
    },
    {
      "enunciado": "A fotossíntese converte energia luminosa em energia química, produzindo glicose a partir de CO₂ e H₂O, liberando O₂. Em plantas C3, a fotorrespiração consome parte da energia fixada sob condições de alta temperatura e baixa concentração de CO₂. Qual é a consequência líquida da fotorrespiração para o balanço de carbono na planta?",
      "alternativas": {
        "a": "Aumento da produção de oxigênio, beneficiando ecossistemas aquáticos.",
        "b": "Perda de carbono orgânico previamente fixado e liberação de CO₂.",
        "c": "Fixação adicional de CO₂ em baixas temperaturas.",
        "d": "Conversão de nitrogênio atmosférico em amônia nas folhas."
      },
      "resposta_correta": "b",
      "nivel": "Médio"
    },
    {
      "enunciado": "Em estudos de populações, a taxa de crescimento intrínseco (r) é um parâmetro fundamental. Duas espécies de insetos têm o mesmo r = 0,2 dia⁻¹, mas uma tem ciclo de vida curto (20 dias) e a outra longo (60 dias). Considerando-se o mesmo número inicial de fêmeas reprodutivas, qual espécie alcançará primeiro uma população de 10.000 indivíduos em um ambiente sem limite de recursos, e por quê?",
      "alternativas": {
        "a": "A espécie de ciclo curto, pois o tempo de geração menor acelera o crescimento exponencial em termos absolutos.",
        "b": "A espécie de ciclo longo, pois indivíduos mais velhos têm maior fecundidade.",
        "c": "Ambas ao mesmo tempo, pois o r igual determina a taxa de crescimento independentemente do ciclo de vida.",
        "d": "Depende da mortalidade dos adultos, não apenas do r."
      },
      "resposta_correta": "a",
      "nivel": "Médio"
    },
    {
      "enunciado": "A decomposição da matéria orgânica é um processo chave para a ciclagem de nutrientes. Em florestas tropicais, a serapilheira se decompõe muito mais rápido que em florestas boreais. Qual combinação de fatores abióticos explica mais adequadamente essa diferença na taxa de decomposição?",
      "alternativas": {
        "a": "Maior pluviosidade e umidade, lixiviando compostos fenólicos inibidores.",
        "b": "Altas temperaturas e umidade, aumentando a atividade dos decompositores microbianos.",
        "c": "Maior diversidade de plantas, produzindo serapilheira mais facilmente degradável.",
        "d": "Solos ácidos com pH baixo, favorecendo fungos decompositores."
      },
      "resposta_correta": "b",
      "nivel": "Médio"
    },
    {
      "enunciado": "O balanço energético global é influenciado pelo albedo, que é a fração da radiação solar refletida por uma superfície. O desmatamento da Amazônia substitui floresta escura (albedo ~0,13) por pastagem (albedo ~0,20). Qual o efeito direto dessa mudança no albedo sobre o clima local?",
      "alternativas": {
        "a": "Aumento da reflexão, reduzindo a energia absorvida e potencialmente diminuindo a temperatura da superfície.",
        "b": "Diminuição da reflexão, aumentando o aquecimento e elevando a evapotranspiração.",
        "c": "Aumento da emissão de radiação infravermelha, resfriando a atmosfera.",
        "d": "Diminuição da formação de nuvens por menor convecção."
      },
      "resposta_correta": "a",
      "nivel": "Difícil"
    },
    {
      "enunciado": "O gráfico do modelo de crescimento logístico (curva sigmoide) apresenta um ponto de inflexão onde a taxa de crescimento per capita é máxima. Nesse ponto, dN/dt é máxima, e N = K/2. Se uma população segue esse modelo e tem K = 10.000 indivíduos, com r = 0,15 por ano, qual é a taxa máxima de crescimento anual (dN/dt) e por que, após esse ponto, a taxa per capita diminui?",
      "alternativas": {
        "a": "1.500 indivíduos/ano; porque a competição intraespecífica reduz a fecundidade.",
        "b": "750 indivíduos/ano; porque a mortalidade aumenta com a densidade.",
        "c": "375 indivíduos/ano; porque a imigração cessa.",
        "d": "3.000 indivíduos/ano; porque o ambiente atinge a capacidade suporte."
      },
      "resposta_correta": "c",
      "nivel": "Difícil"
    },
    {
      "enunciado": "A segregação de nicho pode ocorrer por partilha de recursos ao longo de três dimensões: temporal, espacial e trófica. Em uma comunidade de aves insetívoras em uma floresta temperada, cinco espécies coexistem. Estudos mostram que todas consomem insetos de tamanho semelhante e forrageiam no mesmo estrato da floresta, mas uma delas canta mais cedo pela manhã. Qual mecanismo de partição de nicho está operando e qual sua consequência esperada na dieta?",
      "alternativas": {
        "a": "Partição temporal, reduzindo a sobreposição no horário de forrageamento, mas potencialmente com dietas similares.",
        "b": "Partição trófica, ampliando a amplitude de nicho alimentar.",
        "c": "Partição espacial, com micro-habitats distintos dentro do mesmo estrato",
        "d": "Exclusão competitiva iminente, pois não há partição efetiva."
      },
      "resposta_correta": "a",
      "nivel": "Difícil"
    },
    {
      "enunciado": "A produtividade primária líquida aquática é frequentemente limitada por fósforo em lagos de água doce e por ferro em algumas regiões oceânicas (como o Oceano Antártico). A hipótese da fertilização por ferro propõe adicionar ferro para aumentar o sequestro de CO₂ pelo fitoplâncton. Uma crítica ecológica relevante a essa abordagem é:",
      "alternativas": {
        "a": "O ferro estimula principalmente diatomáceas, que produzem toxinas prejudiciais à cadeia alimentar.",
        "b": "A produção adicional de matéria orgânica pode levar à desoxigenação das águas profundas após a decomposição.",
        "c": "O ferro é rapidamente precipitado em altas temperaturas, tornando o efeito temporário.",
        "d": "O fitoplâncton não utiliza ferro em sua fotossíntese, apenas cobalto."
      },
      "resposta_correta": "b",
      "nivel": "Difícil"
    },
    {
      "enunciado": "Na transferência de energia entre níveis tróficos, a eficiência de assimilação varia conforme o tipo de alimento. Herbívoros geralmente assimilam apenas 20-50% da energia ingerida de plantas, enquanto carnívoros assimilam cerca de 80% de suas presas. Qual componente da energia ingerida explica a menor eficiência de assimilação nos herbívoros?",
      "alternativas": {
        "a": "Maior gasto energético com termorregulação em herbívoros endotérmicos.",
        "b": "Presença de celulose e lignina nas paredes celulares vegetais, de difícil digestão.",
        "c": "Necessidade de buscar alimento em áreas abertas, com maior predação.",
        "d": "Menor número de mitocôndrias nas células intestinais de herbívoros."
      },
      "resposta_correta": "b",
      "nivel": "Difícil"
    },
    {
      "enunciado": "A energia das ondas do mar (wave energy) é convertida por dispositivos flutuantes ou fixos na costa. A potência média por metro linear de frente de onda é proporcional ao quadrado da altura da onda e ao período. Em uma costa com ondas de altura média de 2 m e período de 8 s, a potência é cerca de 30 kW/m. Se a altura sobe para 3 m (mantido o período), a potência aumenta em aproximadamente qual fator e qual desafio tecnológico isso impõe?",
      "alternativas": {
        "a": "2,25 vezes; necessidade de ancoragem mais resistente para tempestades.",
        "b": "2 vezes; maior corrosão por spray marinho.",
        "c": "1,5 vezes; interferência na navegação costeira.",
        "d": "4 vezes; risco para organismos bentônicos."
      },
      "resposta_correta": "a",
      "nivel": "Difícil"
    },
    {
      "enunciado": "A respiração do solo é um dos maiores fluxos de CO₂ dos ecossistemas terrestres para a atmosfera, combinando respiração autotrófica (raízes) e heterotrófica (decomposição). Em um experimento de aquecimento do solo em uma floresta temperada, a respiração total aumentou 30%. Entretanto, parte desse aumento foi devido à maior atividade de decomposição de matéria orgânica antiga, liberando carbono estocado há décadas. Esse fenômeno é um exemplo de:",
      "alternativas": {
        "a": "Feedback positivo que pode acelerar o aquecimento global.",
        "b": "Feedback negativo que estabiliza o clima.",
        "c": "Neutralidade climática, pois o carbono liberado era fóssil.",
        "d": "Fotossíntese líquida negativa."
      },
      "resposta_correta": "a",
      "nivel": "Difícil"
    },
    {
      "enunciado": "A teoria biogeográfica de ilhas de MacArthur & Wilson prevê que o número de espécies em uma ilha é um equilíbrio entre imigração e extinção. O modelo prevê que ilhas mais próximas do continente têm maior riqueza devido à maior taxa de imigração. Aplicando-se esse conceito a fragmentos florestais em uma matriz de pastagem, qual seria a previsão para um fragmento pequeno e isolado a 1 km do contínuo florestal, comparado a um fragmento grande a 10 km?",
      "alternativas": {
        "a": "O fragmento pequeno e próximo terá mais espécies que o grande e distante, se o efeito da distância superar o do tamanho.",
        "b": "O fragmento grande e distante terá sempre mais espécies devido à menor extinção.",
        "c": "Ambos terão o mesmo número de espécies se o tempo de isolamento for igual.",
        "d": "Apenas o fragmento próximo terá espécies de sub-bosque."
      },
      "resposta_correta": "a",
      "nivel": "Difícil"
    },
    {
      "enunciado": "O metano (CH₄) tem potencial de aquecimento global 28 vezes maior que o CO₂ em 100 anos. Em usinas hidrelétricas em regiões tropicais, reservatórios podem emitir metano devido à decomposição anaeróbica da matéria orgânica inundada. Comparando-se a emissão por kWh de uma hidrelétrica tropical com uma termelétrica a gás natural moderno, qual resultado é possível, contrariando a ideia de que hidrelétrica é sempre de baixa emissão?",
      "alternativas": {
        "a": "A termelétrica a gás pode tel menor impacto de aquecimento global em 20 anos se o reservatório tiver alta emissão de metano.",
        "b": "A hidrelétrica emite apenas CO₂ biogênico, que não conta para o aquecimento.",
        "c": "O metano dos reservatórios é capturado e queimado, zerando as emissões.",
        "d": "Termelétricas não emitem metano, apenas CO₂."
      },
      "resposta_correta": "a",
      "nivel": "Difícil"
    },
    {
      "enunciado": "O fenômeno da subsidência ecológica em bordas de fragmentos florestais inclui aumento da mortalidade de árvores, maior incidência de trepadeiras e alterações microclimáticas. Uma árvore de dossel típica, que depende de alta umidade para suas folhas, está na borda exposta ao vento seco da pastagem. Qual processo fisiológico é diretamente afetado, levando à sua morte?",
      "alternativas": {
        "a": "Fotossíntese reduzida por bloqueio dos estômatos por poeira.",
        "b": "Aumento da transpiração que excede a absorção de água, causando estresse hídrico.",
        "c": "Inibição da respiração radicular devido ao solo mais quente.",
        "d": "Fixação simbiótica de nitrogênio comprometida pela luz intensa."
      },
      "resposta_correta": "b",
      "nivel": "Difícil"
    },
    {
      "enunciado": "Os biocombustíveis de primeira geração produzidos a partir de cultivos como milho (etanol) e soja (biodiesel) são criticados por competir com a produção de alimentos e por seu balanço energético nem sempre favorável. O etanol de cana-de-açúcar no Brasil tem balanço energético positivo (cerca de 8 vezes mais energia que a gasta na produção). Qual fator é o mais determinante para essa alta eficiência energética da cana?",
      "alternativas": {
        "a": "Aproveitamento do bagaço para cogeração de eletricidade, substituindo combustíveis fósseis na própria usina.",
        "b": "Baixo uso de fertilizantes nitrogenados, que são intensivos em energia.",
        "c": "Mecanização total da colheita, reduzindo combustível.",
        "d": "Transporte ferroviário dedicado, mais eficiente que caminhões."
      },
      "resposta_correta": "a",
      "nivel": "Difícil"
    },
    {
      "enunciado": "Em metapopulações, a persistência de uma espécie em uma paisagem fragmentada depende do equilíbrio entre extinções locais e recolonizações. Um fragmento de tamanho intermediário tem probabilidade anual de extinção de 0,1 e recebe imigrantes a uma taxa de 0,08 por ano. Qual é a tendência prevista para essa população local e qual ação de manejo teria maior efeito para evitar sua extinção?",
      "alternativas": {
        "a": "Declínio lento; melhorar a conectividade com corredores ecológicos.",
        "b": "Estabilidade; adicionar indivíduos translocados.",
        "c": "Crescimento; aumentar o tamanho do fragmento.",
        "d": "Extinção certa em 10 anos; controlar predadores."
      },
      "resposta_correta": "a",
      "nivel": "Difícil"
    },
    {
      "enunciado": "A energia nuclear de fissão não emite CO₂ durante a operação, mas gera resíduos radiativos de alta atividade com meia-vida de milhares de anos. O debate sobre sua inclusão em uma matriz energética de baixo carbono envolve comparar riscos. Qual afirmação sobre acidentes nucleares graves (como Chernobyl e Fukushima) é correta do ponto de vista da análise de risco energético?",
      "alternativas": {
        "a": "O número de mortes imediatas por TWh gerado é menor que o de carvão, considerando a poluição atmosférica crônica.",
        "b": "Acidentes nucleares causam mais mortes por unidade de energia que todas as renováveis combinadas.",
        "c": "A radiação liberada em acidentes nunca causa efeitos cancerígenos mensuráveis.",
        "d": "Resíduos nucleares são menos perigosos que cinzas de carvão."
      },
      "resposta_correta": "a",
      "nivel": "Difícil"
    },
    {
      "enunciado": "A relação entre área e número de espécies (S = c * Aᶻ) é fundamental em biogeografia. Em arquipélagos oceânicos, o expoente z geralmente varia entre 0,2 e 0,35. Se um fragmento florestal de 10 ha tem 50 espécies de aves, quantas espécies seriam esperadas em um fragmento de 1.000 ha (100 vezes maior) assumindo z = 0,25? E qual processo ecológico explica a inclinação típica dessa curva?",
      "alternativas": {
        "a": "Aproximadamente 125 espécies; efeito da área sobre a extinção.",
        "b": "Aproximadamente 250 espécies; efeito da área sobre a imigração.",
        "c": "Aproximadamente 80 espécies; relação com a heterogeneidade de habitat.",
        "d": "Aproximadamente 50 espécies; saturação pelo pool regional."
      },
      "resposta_correta": "a",
      "nivel": "Difícil"
    },
    {
      "enunciado": "A produção de hidrogênio verde via eletrólise da água usando eletricidade renovável é apontada como solução para descarbonizar setores de difícil eletrificação (como siderurgia e navegação). O principal gargalo atual para sua implantação em larga escala não é tecnológico, mas sim:",
      "alternativas": {
        "a": "A baixa eficiência da eletrólise, que perde 70% da energia.",
        "b": "A necessidade de água doce em grandes quantidades, competindo com agricultura.",
        "c": "O alto consumo de metais de terras raras para os eletrolisadores.",
        "d": "A absoluta falta de demanda por hidrogênio na indústria."
      },
      "resposta_correta": "b",
      "nivel": "Difícil"
    },
    {
      "enunciado": "Em um estudo de campo sobre competição interespecífica, duas espécies de plantas anuais (A e B) foram cultivadas juntas e separadamente. Quando juntas, a espécie A teve biomassa reduzida em 40% e a espécie B em 70% comparadas aos cultivos isolados. O coeficiente de competição de Lotka-Volterra para o efeito de B sobre A (α) foi estimado em 0,4. O que esse valor indica sobre a intensidade relativa da competição?",
      "alternativas": {
        "a": "A espécie B é mais competitiva que A, pois cada indivíduo de B reduz o crescimento de A em 40% do efeito de um indivíduo de A sobre si mesma.",
        "b": "A espécie A é mais competitiva, pois o efeito de B sobre A é menor que 1.",
        "c": "Há competição simétrica, pois α é igual a β (efeito de A sobre B).",
        "d": "Não há competição, pois α é positivo."
      },
      "resposta_correta": "b",
      "nivel": "Difícil"
    }
  ]
}
`;

try {
  const data = JSON.parse(jsonText);
  const rawQuestions = extractQuestionsFromRawJson(data);
  console.log(`Extracting ${rawQuestions.length} questions...`);
  
  rawQuestions.forEach((q, i) => {
    try {
      normalizeQuestions([q]);
    } catch (err) {
      console.error(`Error in question ${i + 1}:`, err.message);
      console.log('Problematic question:', JSON.stringify(q, null, 2));
    }
  });
  
  console.log('Validation finished.');
} catch (err) {
  console.error('JSON Parse error:', err.message);
}
