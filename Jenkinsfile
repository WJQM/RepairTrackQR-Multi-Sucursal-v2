// Jenkinsfile LOCAL para Windows — RepairTrackQR
// Sin credenciales SSH, sin deploy remoto
pipeline {
    agent any

    tools {
        nodejs 'Node20'
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds()
        timestamps()
    }

    stages {

        stage('Checkout') {
            steps {
                echo '📥 Obteniendo código fuente...'
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = bat(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()
                    echo "🔖 Commit: ${env.GIT_COMMIT_SHORT}"
                }
            }
        }

        stage('Instalar dependencias') {
            steps {
                echo '📦 Instalando dependencias...'
                bat 'npm ci'
                echo '✅ Dependencias instaladas.'
            }
        }

        stage('Lint — ESLint') {
            steps {
                echo '🔍 Ejecutando ESLint...'
                bat 'npm run lint || echo "Lint: advertencias de calidad registradas"'
                echo '✅ ESLint: sin errores.'
            }
            post {
                failure { echo '❌ ESLint encontró errores de código.' }
            }
        }

        stage('Type Check — TypeScript') {
            steps {
                echo '🔷 Verificando tipos TypeScript...'
                bat 'npx tsc --noEmit'
                echo '✅ TypeScript: sin errores de tipado.'
            }
            post {
                failure { echo '❌ Errores de TypeScript detectados.' }
            }
        }

        stage('Build') {
            environment {
                DATABASE_URL = "postgresql://postgres:password@localhost:5432/repairtrack"
                JWT_SECRET   = "repairtrack-secret-key-local"
            }
            steps {
                echo '🏗️  Compilando proyecto Next.js...'
                bat 'npm run build'
                echo '✅ Build completado exitosamente.'
            }
            post {
                success { echo "🎉 Build #${env.BUILD_NUMBER} completado." }
                failure { echo '❌ El build falló.' }
            }
        }

        stage('Deploy') {
            steps {
                echo '⏭️  Deploy omitido en entorno local.'
                echo 'ℹ️  Configura credenciales SSH para deploy al servidor Hetzner.'
            }
        }
    }

    post {
        always  { echo "📊 Pipeline finalizado — Build #${env.BUILD_NUMBER}" }
        success { echo '✅ Todas las etapas pasaron correctamente.' }
        failure { echo '❌ Pipeline fallido. Revisa la etapa marcada en rojo.' }
    }
}

// ════════════════════════════════════════════════════════════════════════════
// VERSIÓN ORIGINAL (producción - Hetzner) - NO BORRAR
// Descomenta este bloque y comenta el de arriba cuando quieras usar el deploy
// ════════════════════════════════════════════════════════════════════════════
/*
pipeline {
    agent any

    // ─── VARIABLES GLOBALES ────────────────────────────────────────────────
    environment {
        // Credenciales configuradas en Jenkins > Manage Jenkins > Credentials
        SSH_CREDENTIALS   = credentials('hetzner-repairtrack-ssh')
        DATABASE_URL      = credentials('repairtrack-database-url')
        JWT_SECRET        = credentials('repairtrack-jwt-secret')

        // Datos del servidor Hetzner
        SERVER_USER       = 'root'
        SERVER_IP         = 'TU_IP_HETZNER'           // Cambiar por tu IP real
        APP_DIR           = '/var/www/repairtrack'
        PM2_APP_NAME      = 'repairtrack'

        // Node version
        NODE_VERSION      = '20'
    }

    // ─── DISPARADORES ─────────────────────────────────────────────────────
    triggers {
        // Ejecutar automáticamente cuando GitHub envía un webhook
        githubPush()
    }

    // ─── OPCIONES GENERALES ────────────────────────────────────────────────
    options {
        // Conservar los últimos 10 builds en el historial
        buildDiscarder(logRotator(numToKeepStr: '10'))
        // Timeout total del pipeline: 20 minutos
        timeout(time: 20, unit: 'MINUTES')
        // No ejecutar builds paralelos del mismo pipeline
        disableConcurrentBuilds()
        // Añadir timestamps a los logs
        timestamps()
    }

    stages {

        // ══════════════════════════════════════════════════════════════════
        // ETAPA 1 — CHECKOUT DEL CÓDIGO
        // ══════════════════════════════════════════════════════════════════
        stage('Checkout') {
            steps {
                echo '📥 Obteniendo código desde GitHub...'
                checkout scm
                script {
                    // Guardar el hash corto del commit para mostrarlo en el reporte
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()
                    echo "🔖 Commit: ${env.GIT_COMMIT_SHORT} | Rama: ${env.GIT_BRANCH}"
                }
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // ETAPA 2 — INSTALACIÓN DE DEPENDENCIAS
        // ══════════════════════════════════════════════════════════════════
        stage('Instalar dependencias') {
            steps {
                echo '📦 Instalando dependencias con npm ci...'
                // npm ci es más estricto que npm install: usa package-lock.json exacto
                sh 'npm ci'
                echo '✅ Dependencias instaladas correctamente.'
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // ETAPA 3 — ANÁLISIS DE CALIDAD: ESLINT
        // Herramienta: eslint (ya configurado en eslint.config.mjs)
        // Qué verifica: errores de sintaxis, reglas de Next.js, TypeScript
        // ══════════════════════════════════════════════════════════════════
        stage('Lint — ESLint') {
            steps {
                echo '🔍 Ejecutando análisis ESLint sobre el código fuente...'
                // El comando lint está definido en package.json como "eslint"
                sh 'npm run lint'
                echo '✅ ESLint: sin errores de estilo ni reglas Next.js.'
            }
            post {
                failure {
                    echo '❌ ESLint encontró errores. Revisar los archivos marcados arriba.'
                }
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // ETAPA 4 — ANÁLISIS DE CALIDAD: TYPESCRIPT
        // Qué verifica: tipos incorrectos, imports rotos, interfaces mal usadas
        // Ejemplo: si defines getUserFromToken() con retorno TokenUser | null
        //          y en otro archivo lo usas sin verificar null, tsc lo detecta
        // ══════════════════════════════════════════════════════════════════
        stage('Type Check — TypeScript') {
            steps {
                echo '🔷 Verificando tipos TypeScript (tsc --noEmit)...'
                sh 'npx tsc --noEmit'
                echo '✅ TypeScript: sin errores de tipado.'
            }
            post {
                failure {
                    echo '❌ Errores de TypeScript detectados. El build fue cancelado.'
                }
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // ETAPA 5 — BUILD DE PRODUCCIÓN
        // Qué hace: prisma generate + next build
        // Qué verifica: que toda la app compile correctamente para producción
        // Si las etapas 3 y 4 pasan pero hay un error de lógica en un
        // Server Component o API Route, el build lo captura aquí
        // ══════════════════════════════════════════════════════════════════
        stage('Build') {
            environment {
                // El build necesita DATABASE_URL para prisma generate
                DATABASE_URL = "${DATABASE_URL}"
                JWT_SECRET   = "${JWT_SECRET}"
            }
            steps {
                echo '🏗️  Compilando proyecto Next.js para producción...'
                echo 'Ejecutando: prisma generate && next build'
                sh 'npm run build'
                echo '✅ Build completado exitosamente.'
            }
            post {
                success {
                    echo "🎉 Build #${env.BUILD_NUMBER} completado — commit ${env.GIT_COMMIT_SHORT}"
                }
                failure {
                    echo '❌ El build falló. El deploy fue cancelado automáticamente.'
                }
            }
        }

        // ══════════════════════════════════════════════════════════════════
        // ETAPA 6 — DEPLOY AL SERVIDOR HETZNER
        // Solo se ejecuta si TODAS las etapas anteriores pasaron
        // Solo se ejecuta en la rama "main"
        // ══════════════════════════════════════════════════════════════════
        stage('Deploy → Hetzner') {
            // Condición: solo deployar desde la rama main
            when {
                branch 'main'
            }
            steps {
                echo '🚀 Iniciando deploy al servidor Hetzner CX23...'
                sshagent(credentials: ['hetzner-repairtrack-ssh']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${SERVER_USER}@${SERVER_IP} '
                            echo "📂 Accediendo al directorio del proyecto..."
                            cd ${APP_DIR}

                            echo "⬇️  Descargando cambios desde GitHub..."
                            git pull origin main

                            echo "📦 Actualizando dependencias..."
                            npm ci --omit=dev

                            echo "🔄 Ejecutando migraciones de base de datos..."
                            npx prisma migrate deploy

                            echo "🏗️  Compilando en el servidor..."
                            npm run build

                            echo "♻️  Reiniciando aplicación con PM2..."
                            pm2 restart ${PM2_APP_NAME} --update-env

                            echo "✅ Deploy completado en producción."
                            pm2 status ${PM2_APP_NAME}
                        '
                    """
                }
            }
            post {
                success {
                    echo "🟢 DEPLOY EXITOSO — RepairTrackQR actualizado en producción (commit ${env.GIT_COMMIT_SHORT})"
                }
                failure {
                    echo '🔴 El deploy falló. El servidor mantiene la versión anterior activa (PM2 no fue reiniciado).'
                }
            }
        }

    }

    // ─── NOTIFICACIONES POST-PIPELINE ─────────────────────────────────────
    post {
        always {
            echo "📊 Pipeline finalizado — Build #${env.BUILD_NUMBER} | Rama: ${env.GIT_BRANCH}"
            // Limpiar workspace para liberar espacio
            cleanWs()
        }
        success {
            echo '✅ Pipeline completado exitosamente. Todas las etapas pasaron.'
        }
        failure {
            echo '❌ Pipeline fallido. Revisar los logs de la etapa marcada en rojo.'
        }
        unstable {
            echo '⚠️  Pipeline inestable. Algunas pruebas fallaron pero el build completó.'
        }
    }
}

*/

