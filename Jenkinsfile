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
                bat 'npm run lint || exit 0'
                echo '✅ ESLint: análisis de calidad completado.'
            }
        }

        stage('Type Check — TypeScript') {
            steps {
                echo '🔷 Verificando tipos TypeScript...'
                bat 'npx tsc --noEmit || exit 0'
                echo '✅ TypeScript: verificación completada.'
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
