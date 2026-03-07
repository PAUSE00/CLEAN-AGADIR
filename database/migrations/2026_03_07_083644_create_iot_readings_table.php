<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('iot_readings')) return;
        Schema::create('iot_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collection_point_id')
                ->constrained('collection_points')
                ->onDelete('cascade');
            $table->unsignedTinyInteger('fill_level');          // 0-100 %
            $table->decimal('temperature', 5, 1)->nullable();   // °C
            $table->boolean('fire_alert')->default(false);
            $table->timestamp('read_at');
            $table->timestamps();

            $table->index('collection_point_id');
            $table->index('read_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iot_readings');
    }
};
