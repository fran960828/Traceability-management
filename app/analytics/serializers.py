from rest_framework import serializers

from .models import WineAnalysis


class WineAnalysisSerializer(serializers.ModelSerializer):
    wine_name = serializers.CharField(
        source="production_order.wine.name", read_only=True
    )
    order_code = serializers.CharField(
        source="production_order.batch_number", read_only=True
    )

    class Meta:
        model = WineAnalysis
        fields = "__all__"

    def validate(self, data):
        # DRF ya convierte los strings a Decimal y quita espacios en DecimalFields,
        # pero si quisieras hacer una limpieza manual de un campo que llega como string:
        # p.ej. si laboratory tuviera espacios:
        if data.get("laboratory"):
            data["laboratory"] = data["laboratory"].strip().upper()

        return data
