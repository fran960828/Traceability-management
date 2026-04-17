from decimal import Decimal

import pytest
from django.urls import reverse
from rest_framework import status


@pytest.mark.django_db
class TestProductionCloneAPI:
    """
    Tests para la funcionalidad de clonación proporcional en Partes de Embotellado.
    Verifica que el contrato Backend-Frontend para el recálculo sea correcto.
    """

    def setup_method(self):
        """URLs base para producción."""
        self.list_url = reverse("production_record:order-list")

    def get_clone_url(self, pk):
        """Genera la URL de pre-llenado para clonar un parte."""
        return reverse("production_record:order-clone-prefill", kwargs={"pk": pk})

    def test_production_clone_prefill_provides_dosage_ratios(
        self, auth_client, production_order_factory, production_enological_item_factory
    ):
        """
        Verifica que el clon devuelva el total_liters original y el dosage_per_liter
        de cada material enológico para que el frontend pueda recalcular.
        """
        # 1. Creamos una orden base de 1000 botellas de 0.75L (Total 750L)
        # Aseguramos que el vino tiene un envase con capacidad 0.75
        order_original = production_order_factory(
            quantity_produced=1000,
            wine__default_container__capacity=Decimal("0.750"),
            status="CONFIRMED",
            lot_number="L-ORIGINAL-2024",
        )

        # 2. Añadimos un producto enológico (7.5kg para 750L -> Ratio 0.01 kg/L)
        production_enological_item_factory(
            production_order=order_original, quantity_used=Decimal("7.500")
        )

        # 3. Solicitamos la clonación
        url = self.get_clone_url(order_original.pk)
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data

        # --- VERIFICACIONES DE LIMPIEZA ---
        assert "id" not in data
        assert data["lot_number"] == ""  # Debe estar vacío para nuevo lote
        assert data["status"] == "DRAFT"  # Siempre nace como borrador
        assert (
            data["production_date"] is None
        )  # Se limpia para obligar a poner fecha hoy

        # --- VERIFICACIONES DE CÁLCULO (Contrato Backend-Frontend) ---
        # El total_liters debe ser el de la orden de 1000 botellas (750.0)
        assert Decimal(str(data["total_liters"])) == Decimal("750.000")

        # Verificamos los materiales enológicos y sus ratios
        assert "enological_materials" in data
        assert len(data["enological_materials"]) == 1

        item_clonado = data["enological_materials"][0]
        assert "id" not in item_clonado

        # El ratio debe ser exactamente 0.010000 (7.5 / 750)
        assert Decimal(str(item_clonado["dosage_per_liter"])) == Decimal("0.010000")
        # Mantenemos la cantidad usada original como sugerencia inicial
        assert Decimal(str(item_clonado["quantity_used"])) == Decimal("7.500")

    def test_clone_production_order_preserves_wine_and_user(
        self, auth_client, production_order_factory
    ):
        """
        Verifica que se mantenga la vinculación al vino y al usuario responsable
        para agilizar la creación del nuevo parte.
        """
        order_base = production_order_factory()

        url = self.get_clone_url(order_base.pk)
        response = auth_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        assert response.data["wine"] == order_base.wine.id
        assert response.data["user"] == order_base.user.id
        assert response.data["wine_name"] == order_base.wine.name

    def test_dosage_ratio_is_zero_if_no_volume(
        self, auth_client, production_order_factory, production_enological_item_factory
    ):
        """
        Edge Case: Si por algún error el volumen original es 0, el ratio debe ser 0
        para evitar divisiones por cero en el serializer.
        """
        # Orden con cantidad 0 (aunque el modelo tenga MinValueValidator, forzamos en DB)
        order_zero = production_order_factory(quantity_produced=1)
        order_zero.quantity_produced = 0
        order_zero.save_base(raw=True)

        production_enological_item_factory(
            production_order=order_zero, quantity_used=10
        )

        url = self.get_clone_url(order_zero.pk)
        response = auth_client.get(url)

        # El dosage_per_liter debe ser 0.000 (controlado por el get_dosage_per_liter)
        assert Decimal(
            str(response.data["enological_materials"][0]["dosage_per_liter"])
        ) == Decimal("0.000")
