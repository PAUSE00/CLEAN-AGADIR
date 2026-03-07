<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('collection_points', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('type'); // pharmacy, restaurant, bank, etc.
            $table->enum('waste_category', ['medical', 'organic', 'recyclable', 'paper', 'general'])->default('general');
            $table->decimal('lat', 10, 7);
            $table->decimal('lng', 10, 7);
            $table->integer('fill_level')->default(0); // 0-100%
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('low');
            $table->timestamp('last_collected_at')->nullable();
            $table->boolean('is_active')->default(true);
            $table->boolean('is_depot')->default(false);
            $table->timestamps();
        });

        Schema::create('trucks', function (Blueprint $table) {
            $table->id();
            $table->string('name'); // AGD-001
            $table->enum('size', ['small', 'medium', 'large'])->default('medium');
            $table->string('waste_type')->default('all');
            $table->integer('capacity')->default(60); // nb points
            $table->enum('status', ['idle', 'active', 'maintenance'])->default('idle');
            $table->decimal('current_lat', 10, 7)->nullable();
            $table->decimal('current_lng', 10, 7)->nullable();
            $table->timestamps();
        });

        Schema::create('routes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('truck_id')->constrained()->onDelete('cascade');
            $table->string('algorithm'); // greedy, 2opt, tabu, kmeans, nsga
            $table->json('points_order'); // [point_id, point_id, ...]
            $table->decimal('total_distance_km', 8, 2)->default(0);
            $table->decimal('co2_kg', 8, 3)->default(0);
            $table->integer('computation_ms')->default(0);
            $table->enum('status', ['planned', 'in_progress', 'completed'])->default('planned');
            $table->date('scheduled_date');
            $table->timestamps();
        });

        Schema::create('collection_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_id')->constrained()->onDelete('cascade');
            $table->foreignId('collection_point_id')->constrained()->onDelete('cascade');
            $table->foreignId('truck_id')->constrained()->onDelete('cascade');
            $table->boolean('collected')->default(false);
            $table->integer('fill_level_at_collection')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('collected_at')->nullable();
            $table->timestamps();
        });

        Schema::create('iot_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('collection_point_id')->constrained()->onDelete('cascade');
            $table->integer('fill_level'); // 0-100
            $table->decimal('temperature', 5, 2)->nullable();
            $table->boolean('fire_alert')->default(false);
            $table->timestamp('read_at');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iot_readings');
        Schema::dropIfExists('collection_logs');
        Schema::dropIfExists('routes');
        Schema::dropIfExists('trucks');
        Schema::dropIfExists('collection_points');
    }
};
