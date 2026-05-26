export const MEDICATION_CATALOG = [
  {
    name: 'AMOXICILINA',
    aliases: ['AMOXIL'],
    doses: ['500 MG CÁPSULA', '250 MG/5 ML SUSPENSÃO ORAL']
  },
  {
    name: 'DIPIRONA SÓDICA',
    aliases: ['DIPIRONA', 'NOVALGINA'],
    doses: ['500 MG COMPRIMIDO', '1 G COMPRIMIDO', '50 MG/ML SOLUÇÃO ORAL']
  },
  {
    name: 'IBUPROFENO',
    aliases: [],
    doses: ['200 MG COMPRIMIDO', '400 MG COMPRIMIDO', '50 MG/ML SUSPENSÃO ORAL']
  },
  {
    name: 'PARACETAMOL',
    aliases: ['ACETAMINOFENO'],
    doses: ['500 MG COMPRIMIDO', '750 MG COMPRIMIDO', '200 MG/ML GOTAS']
  },
  {
    name: 'LOSARTANA POTÁSSICA',
    aliases: ['LOSARTANA'],
    doses: ['25 MG COMPRIMIDO', '50 MG COMPRIMIDO', '100 MG COMPRIMIDO']
  },
  {
    name: 'METFORMINA',
    aliases: [],
    doses: ['500 MG COMPRIMIDO', '850 MG COMPRIMIDO', '1000 MG COMPRIMIDO']
  },
  {
    name: 'OMEPRAZOL',
    aliases: [],
    doses: ['20 MG CÁPSULA', '40 MG CÁPSULA']
  },
  {
    name: 'ATORVASTATINA',
    aliases: [],
    doses: ['10 MG COMPRIMIDO', '20 MG COMPRIMIDO', '40 MG COMPRIMIDO']
  },
  {
    name: 'INSULINA REGULAR',
    aliases: ['INSULINA HUMANA REGULAR'],
    doses: ['100 UI/ML SOLUÇÃO INJETÁVEL']
  },
  {
    name: 'INSULINA NPH',
    aliases: ['INSULINA HUMANA NPH'],
    doses: ['100 UI/ML SUSPENSÃO INJETÁVEL']
  }
]

function normalizeText(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

export function getDoseOptionsForMedication(name = '', activeIngredient = '') {
  const normalizedName = normalizeText(name)
  const normalizedIngredient = normalizeText(activeIngredient)

  const profile = MEDICATION_CATALOG.find((medication) => {
    const candidates = [medication.name, ...(medication.aliases || [])].map(normalizeText)
    return (
      candidates.includes(normalizedName) ||
      candidates.some((candidate) => candidate && normalizedName.includes(candidate)) ||
      (normalizedIngredient && candidates.some((candidate) => candidate && normalizedIngredient.includes(candidate)))
    )
  })

  return profile?.doses || []
}
