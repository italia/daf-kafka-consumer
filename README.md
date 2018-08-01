# daf-kafka-consumer

[DEPLOY KAFKA-CONSUMER TEST]
sudo docker build --no-cache -t nexus.teamdigitale.test/kafka-consumer:1.0.0 .
sudo docker push nexus.teamdigitale.test/kafka-consumer:1.0.0
kubectl delete -f kubernetes/test/kafka-consumer.yaml
kubectl apply -f kubernetes/test/kafka-consumer.yaml

[DEPLOY KAFKA-CONSUMER PROD]
sudo docker build --no-cache -t nexus.daf.teamdigitale.it/kafka-consumer:1.0.0 .
sudo docker push nexus.daf.teamdigitale.it/kafka-consumer:1.0.0
kubectl delete -f kubernetes/prod/kafka-consumer.yaml
kubectl apply -f kubernetes/prod/kafka-consumer.yaml