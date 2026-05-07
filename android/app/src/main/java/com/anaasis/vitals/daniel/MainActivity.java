package com.anaasis.vitals.daniel;
import android.os.Bundle; // 📍 Importante añadir
import com.getcapacitor.BridgeActivity;
import com.ubiehealth.capacitor.healthconnect.HealthConnectPlugin;
public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(HealthConnectPlugin.class); // 📍 ESTO DESPIERTA EL PLUGIN
        super.onCreate(savedInstanceState);
        // El registro automático ocurre aquí, pero al extender BridgeActivity 
        // aseguramos que el contexto de salud se inicialice correctamente.
    }
}
