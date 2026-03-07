<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('collection_points', function (Blueprint $table) {
            $table->time('open_time')->nullable()->after('priority');
            $table->time('close_time')->nullable()->after('open_time');
            $table->string('zone')->nullable()->after('close_time');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('collection_points', function (Blueprint $table) {
            $table->dropColumn(['open_time', 'close_time', 'zone']);
        });
    }
};
