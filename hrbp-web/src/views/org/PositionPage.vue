<template>
  <div>
    <el-card shadow="never">
      <el-tabs v-model="tab">
        <!-- 职级体系 -->
        <el-tab-pane label="职级体系" name="level">
          <el-table :data="matrixRows" border>
            <el-table-column prop="category" label="职级类别" width="140" />
            <el-table-column v-for="seq in ['M', 'P', 'S', 'O']" :key="seq" :label="seqName(seq)">
              <template #default="{ row }">
                <el-tag v-for="lv in row[seq]" :key="lv.id" size="small" style="margin:2px"
                        :type="lv.isManagement ? 'warning' : 'primary'" effect="plain">
                  {{ lv.levelCode }}
                </el-tag>
                <span v-if="!row[seq]?.length" style="color:#ccc">—</span>
              </template>
            </el-table-column>
          </el-table>

          <el-divider content-position="left">岗位序列</el-divider>
          <div style="margin-bottom:12px">
            <el-button type="primary" size="small" @click="openFamilyDialog()">新增序列</el-button>
          </div>
          <el-table :data="families" border>
            <el-table-column prop="familyCode" label="序列编码" width="120" />
            <el-table-column prop="familyName" label="序列名称" width="160" />
            <el-table-column prop="levelRange" label="适用职级段" width="140" />
            <el-table-column prop="buildStatus" label="建设状态" width="110">
              <template #default="{ row }">
                <el-tag size="small" :type="{ 已启用: 'success', 建设中: 'warning', 未建设: 'info', 停用: 'danger' }[row.buildStatus]">
                  {{ row.buildStatus }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" />
            <el-table-column label="操作" width="90">
              <template #default="{ row }">
                <el-button link type="primary" @click="openFamilyDialog(row)">编辑</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <!-- 标准职位 -->
        <el-tab-pane label="标准职位" name="position">
          <div class="toolbar">
            <el-input v-model="query.keyword" placeholder="职位名称 / 编码" clearable style="width:200px" @change="loadPositions" />
            <el-select v-model="query.familyId" placeholder="岗位序列" clearable style="width:160px" @change="loadPositions">
              <el-option v-for="f in families" :key="f.id" :label="f.familyName" :value="Number(f.id)" />
            </el-select>
            <el-select v-model="query.status" placeholder="状态" clearable style="width:120px" @change="loadPositions">
              <el-option label="待启用" value="待启用" /><el-option label="已启用" value="已启用" /><el-option label="已停用" value="已停用" />
            </el-select>
            <el-button type="primary" @click="openPosDialog()">新建职位</el-button>
          </div>
          <el-table :data="positions" border>
            <el-table-column prop="positionCode" label="职位编码" width="110" />
            <el-table-column prop="positionName" label="职位名称" width="180" />
            <el-table-column prop="positionType" label="类型" width="80" />
            <el-table-column label="适用职级" width="120">
              <template #default="{ row }">{{ row.levelMin }} ~ {{ row.levelMax }}</template>
            </el-table-column>
            <el-table-column prop="defaultLevel" label="默认职级" width="90" />
            <el-table-column prop="status" label="状态" width="90">
              <template #default="{ row }">
                <el-tag size="small" :type="{ 已启用: 'success', 待启用: 'info', 已停用: 'danger' }[row.status]">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="version" label="版本" width="70" />
            <el-table-column label="操作" width="170">
              <template #default="{ row }">
                <el-button link type="primary" @click="openPosDialog(row)">编辑</el-button>
                <el-button v-if="row.status !== '已启用'" link type="success" @click="onStatus(row, '已启用')">启用</el-button>
                <el-button v-if="row.status === '已启用'" link type="danger" @click="onStatus(row, '已停用')">停用</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <el-dialog v-model="familyDialog" :title="familyForm.id ? '编辑序列' : '新增序列'" width="440px">
      <el-form :model="familyForm" label-width="90px">
        <el-form-item label="序列编码"><el-input v-model="familyForm.familyCode" /></el-form-item>
        <el-form-item label="序列名称"><el-input v-model="familyForm.familyName" /></el-form-item>
        <el-form-item label="职级段"><el-input v-model="familyForm.levelRange" placeholder="如 P3-P8" /></el-form-item>
        <el-form-item label="建设状态">
          <el-select v-model="familyForm.buildStatus">
            <el-option v-for="s in ['未建设','建设中','已启用','停用']" :key="s" :label="s" :value="s" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="familyForm.remark" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="familyDialog = false">取消</el-button>
        <el-button type="primary" @click="onSaveFamily">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="posDialog" :title="posForm.id ? '编辑职位' : '新建职位'" width="520px">
      <el-form :model="posForm" label-width="100px">
        <el-form-item label="职位编码"><el-input v-model="posForm.positionCode" placeholder="序列编码-四位序号，如 BE-0003" :disabled="!!posForm.id" /></el-form-item>
        <el-form-item label="职位名称"><el-input v-model="posForm.positionName" /></el-form-item>
        <el-form-item label="岗位序列">
          <el-select v-model="posForm.familyId">
            <el-option v-for="f in families" :key="f.id" :label="f.familyName" :value="Number(f.id)" />
          </el-select>
        </el-form-item>
        <el-form-item label="职位类型">
          <el-radio-group v-model="posForm.positionType">
            <el-radio value="专业">专业</el-radio><el-radio value="管理">管理</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="适用职级">
          <el-select v-model="posForm.levelMin" placeholder="下限" style="width:110px">
            <el-option v-for="c in levelCodes" :key="c" :label="c" :value="c" />
          </el-select>
          <span style="margin:0 8px">~</span>
          <el-select v-model="posForm.levelMax" placeholder="上限" style="width:110px">
            <el-option v-for="c in levelCodes" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
        <el-form-item label="默认职级">
          <el-select v-model="posForm.defaultLevel" style="width:110px">
            <el-option v-for="c in levelCodes" :key="c" :label="c" :value="c" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="posDialog = false">取消</el-button>
        <el-button type="primary" @click="onSavePosition">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getLevelMatrix, getFamilies, saveFamily, getPositions, createPosition, updatePosition, changePositionStatus } from '../../api/org'

const tab = ref('level')
const matrix = ref({})
const families = ref([])
const positions = ref([])
const query = ref({ keyword: '', familyId: null, status: '' })
const familyDialog = ref(false)
const posDialog = ref(false)
const familyForm = ref({})
const posForm = ref({})

const CATEGORIES = ['战略决策层', '总监级', '经理级', '主管级', '员工级']
const matrixRows = computed(() => CATEGORIES.map(cat => {
  const row = { category: cat }
  for (const seq of ['M', 'P', 'S', 'O']) {
    row[seq] = (matrix.value[seq] || []).filter(l => l.levelCategory === cat)
  }
  return row
}))

const levelCodes = computed(() => Object.values(matrix.value).flat().map(l => l.levelCode))

function seqName(s) {
  return { M: 'M 管理序列', P: 'P 专业序列', S: 'S 销售序列', O: 'O 运营序列' }[s]
}

async function loadAll() {
  matrix.value = await getLevelMatrix()
  families.value = await getFamilies()
  await loadPositions()
}

async function loadPositions() {
  positions.value = await getPositions({ ...query.value, familyId: query.value.familyId || undefined, status: query.value.status || undefined })
}

function openFamilyDialog(row) {
  familyForm.value = row ? { ...row, id: Number(row.id) } : { familyCode: '', familyName: '', levelRange: '', buildStatus: '未建设', remark: '' }
  familyDialog.value = true
}

async function onSaveFamily() {
  await saveFamily(familyForm.value)
  ElMessage.success('保存成功')
  familyDialog.value = false
  families.value = await getFamilies()
}

function openPosDialog(row) {
  posForm.value = row ? { ...row, id: Number(row.id), familyId: Number(row.familyId) } : { positionCode: '', positionName: '', familyId: null, positionType: '专业', levelMin: null, levelMax: null, defaultLevel: null }
  posDialog.value = true
}

async function onSavePosition() {
  if (posForm.value.id) await updatePosition(posForm.value)
  else await createPosition(posForm.value)
  ElMessage.success('保存成功')
  posDialog.value = false
  await loadPositions()
}

async function onStatus(row, status) {
  await changePositionStatus(row.id, status)
  ElMessage.success('已' + status.replace('已', ''))
  await loadPositions()
}

onMounted(loadAll)
</script>

<style scoped>
.toolbar { display: flex; gap: 12px; margin-bottom: 12px; }
</style>
