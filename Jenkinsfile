pipeline {
  agent any
  environment
  {    //it was in every stage
    IMAGE_NAME = 'nexus.teamdigitale.test/kafka-consumer' 
  }
  stages {
    stage('Build') {
      steps { 
        script {          
        sh 'COMMIT_ID=$(echo ${GIT_COMMIT} | cut -c 1-6); docker build . -t $IMAGE_NAME:$BUILD_NUMBER-$COMMIT_ID' 
        }
      }
    }
    stage('Test') {
      steps { //sh' != sh'' only one sh command  
      script {         
        sh '''
	COMMIT_ID=$(echo ${GIT_COMMIT} | cut -c 1-6); 
        CONTAINERID=$(docker run -d -p 3000:3000 $IMAGE_NAME:$BUILD_NUMBER-$COMMIT_ID);
        sleep 5s;
        docker stop ${CONTAINERID}; 
        docker rm ${CONTAINERID}
	''' 
      }
    }
    }    
    stage('Upload'){
      steps {
        script { 
          if(env.BRANCH_NAME == 'testci'  || env.BRANCH_NAME == 'master' ){ 
            sh 'COMMIT_ID=$(echo ${GIT_COMMIT} | cut -c 1-6); docker push $IMAGE_NAME:$BUILD_NUMBER-$COMMIT_ID' 
            sh 'COMMIT_ID=$(echo ${GIT_COMMIT} | cut -c 1-6); docker rmi $IMAGE_NAME:$BUILD_NUMBER-$COMMIT_ID'  
          }       
        }
      }
    }
    stage('Staging') {
      steps { 
        script {
            if(env.BRANCH_NAME=='testci' || env.BRANCH_NAME == 'master'){
                //  sed "s#image: nexus.teamdigitale.test/kafka.*#image: nexus.teamdigitale.test/kafka-consumer:$BUILD_NUMBER-$COMMIT_ID#" kafka-consumer.yaml > kafka-consumer1.yaml
                sh ''' COMMIT_ID=$(echo ${GIT_COMMIT}|cut -c 1-6);
                cd kubernetes/test;
                sed "s#image: nexus.teamdigitale.test/kafka.*#image: nexus.teamdigitale.test/kafka-consumer:$BUILD_NUMBER-$COMMIT_ID#" kafka-consumer.yaml > kafka-consumer$BUILD_NUMBER.yaml;
                kubectl --kubeconfig=../../../../.kube/config.teamdigitale-staging apply -f kafka-consumer$BUILD_NUMBER.yaml --namespace=testci --validate=false'''             
          }
        }
      }
    }
  }
}