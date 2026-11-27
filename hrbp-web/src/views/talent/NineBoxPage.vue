<template>
  <div>
    <el-card shadow="never" style="margin-bottom:12px">
      <div class="toolbar">
        <el-select v-model="cycleId" style="width:220px" @change="load">
          <el-option v-for="c in cycles" :key="c.id" :label="`${c.cycleName}（${c.status}）`" :value="Number(c.id)" />
        </el-select>
        <el-radio-group v-model="tab">
          <el-radio-button value="grid">九宫格汇总</el-radio-button>
          <el-radio-button value="detail">数据明细</el-radio-button>
        </el-radio-group>
        <el-button v-if="cycle?.status === '进行中'" type="warning" @click="onLock(true)">锁定周期</el-button>
        <el-button v-else type="info" @click="onLock(false)">取消锁定</el-button>
      </div>
    </el-card>

    <!-- 九宫格 -->
    <div v-if="tab === 'grid'" class="grid-wrap">
      <div class="y-axis">
        <span v-for="p in ['高','中','低']" :key="p">{{ p }}</span>
        <div class="y-title">潜力 →</div>
      </div>
      <div class="grid">
        <div v-for="cell in grid" :key="cell.potential + cell.match" class="cell" :class="cellClass(cell)" @click="cell.people.length && showCell(cell)">
          <div class="count">{{ cell.count }}</div>
          <div class="names">{{ cell.people.slice(0, 3).join('、') }}<template v-if="cell.people.length > 3"> 等{{ cell.people.length }}人</template></div>
        </div>
        <div class="x-axis"><span v-for="m in ['低','中','高']" :key="m">{{ m }}</span></div>
        <div class="x-title">人岗匹配度 →</div>
      </div>
    </div>

    <!-- 明细 -->
    <el-card v-if="tab === 'detail'" shadow="never">
      <el-table :data="details" border>
        <el-table-column prop="empName" label="姓名" width="80" />
        <el-table-column prop="deptName" label="部门" width="110" />
        <el-table-column prop="positionName" label="职位" min-width="140" />
        <el-table-column prop="jobLevel" label="职级" width="70" />
        <el-table-column label="人岗匹配" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.matchLevel" size="small" :type="levelType(row.matchLevel)">{{ row.matchLevel }}</el-tag><span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="潜力" width="90">
          <template #default="{ row }">
            <el-tag v-if="row.potential" size="small" :type="levelType(row.potential)">{{ row.potential }}</el-tag><span v-else>—</span>
          </template>
        </el-table-column>
        <el-table-column label="关键岗" width="80">
          <template #default="{ row }">{{ row.isKeyPosition ? '是' : '否' }}</template>
        </el-table-column>
        <el-table-column prop="keyDevelop" label="重点培养" width="90">
          <template #default="{ row }">{{ row.keyDevelop || '—' }}</template>
        </el-table-column>
        <el-table-column prop="managerAction" label="后续动作" min-width="140" />
        <el-table-column label="操作" width="90">
          <template #default="{ row }">
            <el-button link type="primary" :disabled="cycle?.status === '已锁定'" @click="openEdit(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog" title="编辑盘点评估" width="480px">
      <el-form label-width="100px">
        <el-form-item label="人岗匹配度">
          <el-radio-group v-model="form.matchLevel"><el-radio v-for="l in ['高','中','低']" :key="l" :value="l">{{ l }}</el-radio></el-radio-group>
        </el-form-item>
        <el-form-item label="潜力">
          <el-radio-group v-model="form.potential"><el-radio v-for="l in ['高','中','低']" :key="l" :value="l">{{ l }}</el-radio></el-radio-group>
        </el-form-item>
        <el-form-item label="关键岗">
          <el-switch v-model="form.isKeyPosition" :active-value="1" :inactive-value="0" />
        </el-form-item>
        <el-form-item label="重点培养">
          <el-select v-model="form.keyDevelop" clearable>
            <el-option v-for="k in ['是','否','待观察']" :key="k" :label="k" :value="k" />
          </el-select>
        </el-form-item>
        <el-form-item label="后续动作"><el-input v-model="form.managerAction" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" @click="onSave">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="cellDialog" :title="cellTitle" width="400px">
      <el-tag v-for="p in cellPeople" :key="p" style="margin:4px">{{ p }}</el-tag>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '../../api/request'

const getCycles = () => request.get('/talent/review/cycles')
const getDetails = cycleId => request.get('/talent/review/details', { params: { cycleId } })
const getNineBox = cycleId => request.get('/talent/review/nine-box', { params: { cycleId } })
const saveDetail = data => request.post('/talent/review/details', data)
const lockCycle = (id, lock) => request.post(`/talent/review/cycles/${id}/lock/${lock}`)

const cycles = ref([])
const cycleId = ref(null)
const cycle = computed(() => cycles.value.find(c => Number(c.id) === cycleId.value))
const tab = ref('grid')
const grid = ref([])
const details = ref([])
const dialog = ref(false)
const form = ref({})
const cellDialog = ref(false)
const cellPeople = ref([])
const cellTitle = ref('')

async function load() {
  if (!cycleId.value) return
  grid.value = await getNineBox(cycleId.value)
  details.value = await getDetails(cycleId.value)
}

function levelType(l) { return { 高: 'success', 中: 'warning', 低: 'danger' }[l] }
function cellClass(cell) {
  if (cell.potential === '高' && cell.match === '高') return 'star'
  if (cell.potential === '低' && cell.match === '低') return 'risk'
  return ''
}
function showCell(cell) {
  cellTitle.value = `${cell.potential}潜力 / ${cell.match}匹配`
  cellPeople.value = cell.people
  cellDialog.value = true
}

function openEdit(row) {
  form.value = { id: Number(row.id), cycleId: Number(row.cycleId), empId: Number(row.empId), matchLevel: row.matchLevel, potential: row.potential, isKeyPosition: row.isKeyPosition, keyDevelop: row.keyDevelop, managerAction: row.managerAction }
  dialog.value = true
}

async function onSave() {
  await saveDetail(form.value)
  ElMessage.success('已保存')
  dialog.value = false
  load()
}

async function onLock(lock) {
  await lockCycle(cycleId.value, lock)
  ElMessage.success(lock ? '已锁定，全部只读' : '已解锁')
  cycles.value = await getCycles()
  load()
}

onMounted(async () => {
  cycles.value = await getCycles()
  if (cycles.value.length) cycleId.value = Number(cycles.value[0].id)
  load()
})
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.grid-wrap { display: flex; gap: 8px; background: #fff; padding: 20px; border-radius: 8px; }
.y-axis { display: flex; flex-direction: column; justify-content: space-around; text-align: center; font-weight: 600; color: #666; position: relative; width: 30px; }
.y-title { position: absolute; top: -18px; left: 0; font-size: 12px; color: #999; width: 80px; }
.grid { flex: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; position: relative; }
.cell { min-height: 110px; border: 1px solid #e4e7ed; border-radius: 8px; padding: 14px; cursor: pointer; transition: all .15s; background: #fafbfc; }
.cell:hover { box-shadow: 0 2px 12px rgba(0,0,0,.1); }
.cell.star { background: #f0f9eb; border-color: #67c23a; }
.cell.risk { background: #fef0f0; border-color: #f56c6c; }
.cell .count { font-size: 26px; font-weight: 700; color: #1d2540; }
.cell .names { font-size: 12px; color: #666; margin-top: 6px; }
.x-axis { grid-column: 1 / 4; display: flex; justify-content: space-around; font-weight: 600; color: #666; }
.x-title { grid-column: 1 / 4; text-align: center; font-size: 12px; color: #999; }
</style>
