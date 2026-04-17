# wines/services.py


class WineRecipeService:
    @staticmethod
    def get_recipe_deficiencies(wine):
        """
        Analiza los materiales faltantes según el tipo de envase.
        Reglas de negocio centralizadas de Ontalba.
        """
        container = wine.default_container

        # 1. El envase es el requisito mínimo universal
        if not container:
            return ["Envase"]

        missing = []
        p_type = container.packaging_type

        # 2. Lógica por tipo de formato
        if p_type == "VIDRIO":
            if not wine.default_cork:
                missing.append("Cierre (Corcho/Rosca)")
            if not wine.default_front_label:
                missing.append("Etiqueta Frontal")
            if not wine.default_back_label:
                missing.append("Contraetiqueta")

        elif p_type == "PLASTICO":  # Garrafas
            if not wine.default_cork:
                missing.append("Tapón")
            if not wine.default_front_label:
                missing.append("Etiqueta Frontal")

        # El BIB no añade requerimientos extra
        return missing
