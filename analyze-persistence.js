import fs from 'fs'
import path from 'path'

async function analyzePersistence() {
  console.log('=== ANÁLISIS DE PERSISTENCIA POR SECCIÓN ===\n')
  
  const schemasDir = path.join(process.cwd(), 'sanity', 'schemas')
  const schemaFiles = fs.readdirSync(schemasDir).filter(f => f.endsWith('.ts') && f !== 'index.ts')
  
  const sections = []
  
  for (const file of schemaFiles) {
    const filePath = path.join(schemasDir, file)
    const content = fs.readFileSync(filePath, 'utf8')
    
    const sectionName = file.replace('.ts', '')
    
    // Extraer información básica
    const hasElementStyles = content.includes('elementStyles')
    const hasNodesJson = content.includes('nodesJson')
    const hasEditorComment = content.includes('managed via editor API') || content.includes('not Studio UI')
    const hasJsonType = content.includes('type: "json"')
    const hasHiddenField = content.includes('hidden:')
    
    // Determinar tipo de documento
    let docType = 'unknown'
    if (content.includes('type: "document"')) docType = 'document'
    else if (content.includes('type: "object"')) docType = 'object'
    
    sections.push({
      name: sectionName,
      file,
      hasElementStyles,
      hasNodesJson,
      hasEditorComment,
      hasJsonType,
      hasHiddenField,
      docType
    })
  }
  
  // 1. Mostrar resumen por sección
  console.log('1. RESUMEN POR SECCIÓN:\n')
  
  sections.forEach(section => {
    console.log(`${section.name}:`)
    console.log(`  Tipo: ${section.docType}`)
    console.log(`  elementStyles: ${section.hasElementStyles ? '✅' : '❌'}`)
    console.log(`  nodesJson: ${section.hasNodesJson ? '✅' : '❌'}`)
    console.log(`  Comentario editor: ${section.hasEditorComment ? '✅' : '❌'}`)
    console.log(`  JSON type: ${section.hasJsonType ? '✅' : '❌'}`)
    console.log(`  Hidden fields: ${section.hasHiddenField ? '✅' : '❌'}`)
    console.log('')
  })
  
  // 2. Analizar archivos de componentes para entender qué leen
  console.log('2. ANÁLISIS DE COMPONENTES (qué leen):\n')
  
  const componentsDir = path.join(process.cwd(), 'components')
  const componentFiles = [
    'hero-section.tsx',
    'navigation.tsx',
    'intro-banner-section.tsx',
    'latest-release-section.tsx',
    'band-members-section.tsx',
    'contact-section.tsx',
    'press-kit-section.tsx'
  ]
  
  for (const compFile of componentFiles) {
    const compPath = path.join(componentsDir, compFile)
    if (!fs.existsSync(compPath)) continue
    
    const content = fs.readFileSync(compPath, 'utf8')
    const compName = compFile.replace('.tsx', '').replace('-section', '')
    
    // Buscar imports de loaders
    const hasHeroLoader = content.includes('loadHeroData') || content.includes('hero-loader')
    const hasNavLoader = content.includes('loadNavigationData') || content.includes('navigation-loader')
    const hasHomeEditor = content.includes('homeEditorState') || content.includes('home-editor')
    const hasElementStyles = content.includes('elementStyles')
    const hasGetElementLayoutStyle = content.includes('getElementLayoutStyle')
    
    console.log(`${compName}:`)
    console.log(`  Hero loader: ${hasHeroLoader ? '✅' : '❌'}`)
    console.log(`  Nav loader: ${hasNavLoader ? '✅' : '❌'}`)
    console.log(`  Home editor: ${hasHomeEditor ? '✅' : '❌'}`)
    console.log(`  elementStyles: ${hasElementStyles ? '✅' : '❌'}`)
    console.log(`  getElementLayoutStyle: ${hasGetElementLayoutStyle ? '✅' : '❌'}`)
    console.log('')
  }
  
  // 3. Analizar loaders
  console.log('3. ANÁLISIS DE LOADERS (qué cargan):\n')
  
  const loadersDir = path.join(process.cwd(), 'lib', 'sanity')
  const loaderFiles = fs.readdirSync(loadersDir).filter(f => f.includes('loader') || f.includes('Loader'))
  
  for (const loaderFile of loaderFiles) {
    const loaderPath = path.join(loadersDir, loaderFile)
    const content = fs.readFileSync(loaderPath, 'utf8')
    
    console.log(`${loaderFile}:`)
    
    // Qué tipo de datos carga
    if (content.includes('elementStyles')) console.log('  ✅ elementStyles')
    if (content.includes('nodesJson')) console.log('  ✅ nodesJson')
    if (content.includes('HeroData')) console.log('  ✅ HeroData')
    if (content.includes('NavigationData')) console.log('  ✅ NavigationData')
    
    // Qué documentos consulta
    if (content.includes('heroSection')) console.log('  📄 heroSection')
    if (content.includes('navigation')) console.log('  📄 navigation')
    if (content.includes('homeEditorState')) console.log('  📄 homeEditorState')
    if (content.includes('bandMembersSettings')) console.log('  📄 bandMembersSettings')
    
    console.log('')
  }
  
  // 4. Detectar patrones problemáticos
  console.log('4. PATRONES PROBLEMÁTICOS DETECTADOS:\n')
  
  const problematicSections = sections.filter(s => 
    s.hasElementStyles || 
    s.hasNodesJson || 
    s.hasEditorComment ||
    s.hasJsonType
  )
  
  if (problematicSections.length > 0) {
    console.log('Secciones con persistencia compleja:')
    problematicSections.forEach(s => {
      const flags = []
      if (s.hasElementStyles) flags.push('elementStyles')
      if (s.hasNodesJson) flags.push('nodesJson')
      if (s.hasEditorComment) flags.push('editor-managed')
      if (s.hasJsonType) flags.push('JSON-type')
      
      console.log(`  ${s.name}: ${flags.join(', ')}`)
    })
  } else {
    console.log('✅ No se detectaron patrones problemáticos evidentes')
  }
  
  // 5. Mapeo final
  console.log('\n5. MAPEO FINAL DE PERSISTENCIA:\n')
  
  // Hero Section
  console.log('🔹 HERO SECTION:')
  console.log('   Documento base: heroSection')
  console.log('   Campos: title, subtitle, logo, backgroundImage, elementStyles')
  console.log('   Loader: hero-loader.ts')
  console.log('   Componente: hero-section.tsx')
  console.log('   ✅ Fuente única (pero elementStyles puede contaminarse)')
  
  // Navigation
  console.log('\n🔹 NAVIGATION:')
  console.log('   Documento base: navigation')
  console.log('   Campos: links[], elementStyles')
  console.log('   Loader: navigation-loader.ts')
  console.log('   Componente: navigation.tsx')
  console.log('   ✅ Fuente única')
  
  // Home Editor State
  console.log('\n🔹 HOME EDITOR STATE (global):')
  console.log('   Documento: homeEditorState (singleton)')
  console.log('   Campos: nodesJson, elementStyles')
  console.log('   Loader: home-editor-state.ts')
  console.log('   Uso: home-editor-overrides-provider.tsx')
  console.log('   ⚠️  Fuente paralela para overrides')
  
  // Band Members
  console.log('\n🔹 BAND MEMBERS:')
  console.log('   Documento base: bandMember (lista)')
  console.log('   Documento settings: bandMembersSettings')
  console.log('   Campos: elementStyles (en settings)')
  console.log('   ⚠️  DOBLE FUENTE: contenido en bandMember, estilos en bandMembersSettings')
  
  // Intro Banner
  console.log('\n🔹 INTRO BANNER:')
  console.log('   Documento base: introBanner')
  console.log('   Campos: title, subtitle, gif, elementStyles')
  console.log('   ✅ Fuente única')
  
  // Latest Release
  console.log('\n🔹 LATEST RELEASE:')
  console.log('   Documento base: latestRelease')
  console.log('   Campos: title, description, coverImage, links, elementStyles')
  console.log('   ✅ Fuente única')
  
  // Contact Section
  console.log('\n🔹 CONTACT SECTION:')
  console.log('   Documento base: contactSection')
  console.log('   Campos: title, description, socialLinks, elementStyles')
  console.log('   ✅ Fuente única')
  
  // Press Kit
  console.log('\n🔹 PRESS KIT:')
  console.log('   Documento base: pressKitSection')
  console.log('   Campos: title, description, assets[], elementStyles')
  console.log('   ✅ Fuente única')
}

analyzePersistence()